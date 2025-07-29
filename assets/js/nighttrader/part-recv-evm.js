/*!
* ych SPA exchange
*
* Copyright Lynxline LLC, yshurik, 2019-2023,
* Common Clause license https://commonsclause.com/
*/

$( function() {

console.log("Init part recv-evm");


let page = {};
page.show_error = function (msg) {
  /*xy_fn.JBoxDialog.setTitle('ERROR');
  xy_fn.JBoxDialog.setContent(msg);
  xy_fn.JBoxDialog.open();
  */

  iziToast.error({
      icon: 'ti ti-alert-circle',
      title: 'Error',
      message: `${msg}`,
    });

}

page.show_warn = function (msg) {
  /*xy_fn.JBoxDialog.setTitle('WARNING');
  xy_fn.JBoxDialog.setContent(msg);
  xy_fn.JBoxDialog.open();
  */
  iziToast.warning({
      icon: 'ti ti-alert-triangle',
      title: 'Caution',
      message: `${msg}`,
    });
}

page.clear_error = function (msg) {
   //xy_fn.JBoxDialog.close();
   iziToast.destroy();
}


let part = {};
part.part_recv_evm = async function (is_logged, coin) {
  let coin_pre = part.coin;
  part.coin = coin;

  part.account = 0n;
  part.allowance_to_set = 0n;
  part.allowance_to_set_max = true;
  part.allowance_wei = 0n;
  $( '#page-recv-evm-text-set-allow'  ).val("MAX"); // default

  part.deposit_ready = 0n;
  part.deposit_to_set = 0n;
  $( '#page-recv-evm-text-quantity'  ).val("0.00"); // default

  $( '#part-recv-evm-span-coin' ).text(coin);
  $( '#part-recv-evm-span-desposit-addr-coin' ).text(coin);
  $( '#page-recv-evm-label-account' ).text(coin);
  $( '#page-recv-evm-label-set-allow' ).text(coin);
  $( '#page-recv-evm-label-ready' ).text(coin);
  $( '#page-recv-evm-label-quantity' ).text(coin);
  $( '#page-recv-evm-but-deposit' ).text("Deposit "+coin);

  if (coin_pre != coin) {
  }

  part.update(coin, true);
};
ych.gui.parts["recv"]["evm"] = part;
//let page = ych.gui.pages["recv"];

part.update = async function(coin, check_user) {
  if (part.coin == "" || part.coin == undefined) {
    $( '#part-recv-evm-span-coin' ).text("-");
    $( '#part-recv-evm-span-desposit-addr-coin' ).text("-");
    return;
  }

  let coininfo = ych.data.coininfos[part.coin];
  let usdrate = coininfo.ext.priceext;
  let usdext = coininfo.ext.priceext * Number(coininfo.fee.minamount) / 1.e8;

  if (coininfo.type != "evm_t1" && coininfo.type != "erc20_t1") {
    $( '#page-recv-div-addr-evm_t1' ).hide();
    return;
  }

  if (!(part.coin in ych.address) || ych.address[part.coin] == "") {
    $( '#page-recv-div-addr-evm_t1' ).hide();
    return;
  }

  $( '#page-recv-div-addr-evm_t1' ).show();

  $( '#part-recv-evm-span-coin-net' ).text(coininfo.cfg.net+" ChainId="+coininfo.cfg.netid);
  $( '#part-recv-evm-but-switch-net' )
    .text("Switch network to "+coininfo.cfg.net+" ChainId="+coininfo.cfg.netid);

  // check ethereum
  if (typeof window.ethereum == 'undefined') {
    $( '#part-recv-evm-span-web3-detected' ).text("NO");
    $( '#page-recv-evm-span-curr-net' ).text("-");
    $( '#part-recv-evm-div-web3-ready' ).hide();
    return;
  }

  $( '#part-recv-evm-div-web3-ready' ).show();
  $( '#part-recv-evm-span-web3-detected' ).text("YES");
  $( '#page-recv-evm-span-curr-net' ).text(window.ethereum.chainId);
  if (parseInt(window.ethereum.chainId, 16) != coininfo.cfg.netid) {
    $( '#part-recv-evm-but-switch-net' ).show();
    $( '#part-recv-evm-div-net-ready' ).hide();
    return;
  }

  // on right network
  $( '#part-recv-evm-but-switch-net' ).hide();
  $( '#part-recv-evm-div-net-ready' ).show();

  let account = await part.get_ethereum_account_address();
  //console.log("get_ethereum_account", account);

  if (account == "") {
    $( '#part-recv-evm-span-account-short' ).text("-");
    $( '#part-recv-evm-span-register-sender' ).text("-");
    $( '#part-recv-evm-but-connect-account' ).show();
    $( '#part-recv-evm-div-account-ready' ).hide();
    return;
  }

  // has account connected
  $( '#part-recv-evm-but-connect-account' ).hide();
  let short = account.substr(0,6)+"..."+account.substr(account.length-4,account.length);
  $( '#part-recv-evm-span-account-short' ).text(short);
  $( '#part-recv-evm-span-register-sender' ).text(short);
  $( '#part-recv-evm-span-unregister-sender' ).text(short);
  $( '#part-recv-evm-div-account-ready' ).show();

  if (coininfo.type == "evm_t1") {
    $( '#part-recv-evm-div-deposit-erc20' ).hide();
    $( '#part-recv-evm-div-senders' ).show();
    // request abi to see if account already in use
    let has_sender_to_other = false;
    if (check_user) {
      const provider = new _ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      part.vault = new _ethers.Contract(coininfo.cfg.con, ych.evm_abi_vault, signer);
      const user_addr = await part.vault.users(account);
      if (user_addr != "0x0000000000000000000000000000000000000000" &&
          user_addr != ych.address[part.coin]) {
        $( '#part-recv-evm-div-deposit-addr' ).hide();
        $( '#part-recv-evm-div-register-sender' ).hide();
        $( '#part-recv-evm-div-unregister-sender' ).show();
        console.log("The account is bound to another user: "+user_addr);
        has_sender_to_other = true;
        return;
      }
      $( '#part-recv-evm-div-unregister-sender' ).hide();
    } else {
      if ($( '#part-recv-evm-div-unregister-sender' ).is(":visible")) {
        has_sender_to_other = true;
        return;
      }
    }

    let has_sender_registred = false;
    ych.asset_extra[part.coin].senders.forEach(function(sender, idx) {
      if (account == sender.text) {
        if (sender.expr == 0) {
          has_sender_registred = true;
        }
      }
    });

    let senders_len = ych.asset_extra[part.coin].senders.length;
    if (senders_len >0) {
      ych.gui.table_resize('part-recv-evm-table-addrs', senders_len);
      ych.asset_extra[part.coin].senders.forEach(function(sender, idx) {
        if (account == sender.text) {
          $( '#part-recv-evm-table-addrs-'+idx+'-N' ).text(idx+1+" CURRENT");
        } else {
          $( '#part-recv-evm-table-addrs-'+idx+'-N' ).text(idx+1);
        }
        $( '#part-recv-evm-table-addrs-'+idx+'-Sender' ).html(ych.gui.format_addr_link(part.coin, sender.text));
        $( '#part-recv-evm-table-addrs-'+idx+'-Status-C' ).text(sender.stat);
        $( '#part-recv-evm-table-addrs-'+idx+'-Action-C'  ).html("<a id='part-recv-evm-table-addrs-"+idx+"-a' href='remove'>X</a>");
        $( '#part-recv-evm-table-addrs-'+idx+'-a' ).click(function(event) {
          event.preventDefault();
          part.remove_sender_call(sender.text);
        });
      });
    } else {
      ych.gui.table_resize('part-recv-evm-table-addrs', 1);
      $( '#part-recv-evm-table-addrs-0-N'        ).text("");
      $( '#part-recv-evm-table-addrs-0-Sender'   ).text("No registered senders");
      $( '#part-recv-evm-table-addrs-0-Status-C' ).text("");
      $( '#part-recv-evm-table-addrs-0-a' ).text("");
    }

    if (!has_sender_registred) {
      $( '#part-recv-evm-div-deposit-addr' ).hide();
      if (!has_sender_to_other) {
        $( '#part-recv-evm-div-register-sender' ).show();
      }
      return;
    }

    // has registered sender address
    $( '#part-recv-evm-div-register-sender' ).hide();
    $( '#part-recv-evm-div-deposit-addr' ).show();
    $( '#part-recv-evm-span-deposit-addr' ).text(coininfo.cfg.con);
  }

  if (coininfo.type == "erc20_t1") {
    $( '#part-recv-evm-div-deposit-addr' ).hide();
    $( '#part-recv-evm-div-register-sender' ).hide();
    $( '#part-recv-evm-div-unregister-sender' ).hide();
    $( '#part-recv-evm-div-senders' ).hide();
    $( '#part-recv-evm-div-deposit-erc20' ).show();

    if (check_user) {
      const provider = new _ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      part.erc20 = new _ethers.Contract(coininfo.cfg.coin, ych.evm_abi_erc20, signer);
      const balance_wei = await part.erc20.balanceOf(account);
      const balance_weis = balance_wei.toString();
      const balance_sat = BigInt(balance_weis) / 10000000000n;

      let usdrate = coininfo.ext.priceext;

      $( '#page-recv-evm-text-account'  ).html(
        '<span class="ysemi">'+
        "≈$"+
        (Number(balance_sat) / 1.e8 *usdrate).toFixed(2)+
        '</span>'+
        " "+
        ych.gui.format_amount(balance_sat));
      part.account = balance_sat;

      const allowance_wei = await part.erc20.allowance(account, coininfo.cfg.con);
      const allowance_weis = allowance_wei.toString();
      const allowance_sat = BigInt(allowance_weis) / 10000000000n;
      part.allowance_wei = allowance_wei;

      //console.log(allowance_wei, balance_wei, allowance_wei.gte(balance_wei))
      let ready_to_deposit_sat = balance_sat;
      if (allowance_wei.gte(balance_wei)) {
        $( '#part-recv-evm-div-deposit-erc20-allowance' ).hide();
        ready_to_deposit_sat = balance_sat;
      } else {
        $( '#part-recv-evm-div-deposit-erc20-allowance' ).show();
        ready_to_deposit_sat = allowance_sat;
      }

      $( '#page-recv-evm-text-ready'  ).html(
        '<span class="ysemi">'+
        "≈$"+
        (Number(ready_to_deposit_sat) / 1.e8 *usdrate).toFixed(2)+
        '</span>'+
        " "+
        ych.gui.format_amount(ready_to_deposit_sat));
      part.deposit_ready = ready_to_deposit_sat;

    }
  }
};

ych.gui.table_init(
  'part-recv-evm-table-addrs',
  ['N', 'Sender', 'Status-C', 'Action-C'], []
);

part.check_ethereum_netid = function() {
  part.update(part.coin, false);
};

part.check_ethereum_netid_repeat = function() {
  part.check_ethereum_netid();
  setTimeout(function () {
    part.check_ethereum_netid_repeat();
  }, 5000);
};
part.check_ethereum_netid_repeat();

$( '#part-recv-evm-but-switch-net' ).click( function( event ) {
  event.preventDefault();

  console.log('part-recv-evm-but-switch-net: ', part.coin);

  $( '#part-recv-evm-but-switch-net' ).prop("disabled",true);
  let coininfo = ych.data.coininfos[part.coin];
  part.switch_ethereum_net("0x"+coininfo.cfg.netid.toString(16));
});

part.switch_ethereum_net = async function(netid) {
  await window.ethereum.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: netid }]
  });
  $( '#part-recv-evm-but-switch-net' ).prop("disabled",false);
  setTimeout(function () { // lets 1 sec wait
    part.check_ethereum_netid();
  }, 1000);
};

$( '#part-recv-evm-but-connect-account' ).click( function( event ) {
  event.preventDefault();
  $( '#part-recv-evm-but-connect-account' ).prop("disabled",true);
  part.request_ethereum_account();
});

part.get_ethereum_account_address = async function() {
  try {
    let accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length ==0) {
      return "";
    }
    let account = accounts[0];
    if (account == "") {
      return "";
    }
    const provider = new _ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    return signer.getAddress();
  } catch(e) {
  }
  return "";
};

part.request_ethereum_account = async function() {
  try {
    let accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts.length ==0) {
      $( '#part-recv-evm-span-account-short' ).text("<no_address>");
      $( '#part-recv-evm-span-register-sender' ).text("<no_address>");
      $( '#part-recv-evm-but-connect-account' ).prop("disabled",false);
      return;
    }
    let account = accounts[0];
    if (account == "") {
      $( '#part-recv-evm-span-account-short' ).text("<no_address>");
      $( '#part-recv-evm-span-register-sender' ).text("<no_address>");
      $( '#part-recv-evm-but-connect-account' ).prop("disabled",false);
      return;
    }
    const provider = new _ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const addr = signer.getAddress();
    const short = addr.substr(0,6)+"..."+addr.substr(addr.length-4,addr.length);
    $( '#part-recv-evm-span-account-short' ).text(short);
    $( '#part-recv-evm-span-register-sender' ).text(short);
  } catch(e) {
  }
  $( '#part-recv-evm-but-connect-account' ).prop("disabled",false);
};

$( '#part-recv-evm-but-register-sender' ).click( function( event ) {
  event.preventDefault();
  $( '#part-recv-evm-but-register-sender' ).prop("disabled",true);
  part.register_contract_call();
});

part.register_sender_call = async function() {
  page.clear_error();
  ych.gui.call_with_pass1().then((res) => {
    if (!res.ok) {
      page.show_error(res.msg);
      return;
    }
    part.register_sender_call_with_pass();
  });
};

part.register_sender_call_with_pass = async function() {
  let account_addr = "";
  let block = 0n;
  try {
    let accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length ==0) {
      return "";
    }
    let account = accounts[0];
    if (account == "") {
      return "";
    }
    const provider = new _ethers.providers.Web3Provider(window.ethereum);
    block = await provider.getBlockNumber()+1;
    const signer = provider.getSigner();
    account_addr = await signer.getAddress();
    if (account_addr == "") {
      page.show_error("No selected account");
      return;
    }
  } catch(e) {
    page.show_error("Exception: "+e);
  }

  //console.log("account_addr",account_addr);
  //console.log("block",block);

  // usig
  let call = "register1";
  ych.init_coinjs();
  let buftext =
    part.coin+
    call+
    ych.address[part.coin]+
    block.toString()+
    account_addr+
    ych.pubkey1+
    ych.nnum;
  //console.log(buftext);
  let buffer = ych.str2bytes(buftext);
  let hash1 = Crypto.SHA256(buffer, {asBytes: true});
  let hash2 = Crypto.SHA256(hash1, {asBytes: true});
  let tx = coinjs.transaction();
  let wif = coinjs.privkey2wif(ych.prvkey1);
  let sig = tx.transactionSig(0, wif, 1, hash2);
  let exchangeUrl = xybot.network;
  // api call
  $.ajax({
    type: "PUT",
    url: 'https://' + exchangeUrl + window.ych_address_path,
    data: JSON.stringify({
      coin: part.coin,
      call: call,
      user: ych.address[part.coin],
      blck: block,
      sender: account_addr,
      usig: sig
    }),
    dataType: 'json',
    headers: {
      'Authorization': 'Bearer ' + window.getJWT()
    },
    success: function(data) {
      $( '#part-recv-evm-but-register-sender' ).prop("disabled",false);
      if (data.ok) {
        page.clear_error();
      } else {
        page.show_error(data.error);
        console.log(data);
      }
    },
    error: function(xhr, status, error) {
      page.show_error(status+": "+error);
      $( '#part-recv-evm-but-register-sender' ).prop("disabled",false);
    }
  });
};

part.register_contract_call = async function() {
  page.clear_error();
  ych.gui.call_with_pass1().then((res) => {
    if (!res.ok) {
      page.show_error(res.msg);
      return;
    }
    part.register_contract_call_with_pass();
  });
};

part.register_contract_call_with_pass = async function() {
  try {
    const provider = new _ethers.providers.Web3Provider(window.ethereum);
    const coininfo = ych.data.coininfos[part.coin];
    const signer = provider.getSigner();
    part.vault = new _ethers.Contract(coininfo.cfg.con, ych.evm_abi_vault, signer);
    const ustate2 = await part.vault.ustate();
    const account_addr = await signer.getAddress();

    const tw = Math.floor((new Date).getTime() / 1000) +coininfo.cfg.tw; // 10mins to complete
    const user = ych.address[part.coin];
    const sig = ych.evm_sign1(user, ustate2, 0n, account_addr, tw);
    const tx = await part.vault.register1(user, sig, tw).then((result) => {

      page.clear_error();
      part.register_sender_call();

    }, (error) => {
        page.show_error(error.reason);

        // error.reason - The Revert reason; this is what you probably care about. :)
        // Additionally:
        // - error.address - the contract address
        // - error.args - [ BigNumber(1), BigNumber(2), BigNumber(3) ] in this case
        // - error.method - "someMethod()" in this case
        // - error.errorSignature - "Error(string)" (the EIP 838 sighash; supports future custom errors)
        // - error.errorArgs - The arguments passed into the error (more relevant post EIP 838 custom errors)
        // - error.transaction - The call transaction used
    });

  } catch(e) {
    page.show_error("Exception happened");
    console.log("exception:", e);
  }
};

// cancel/remove

$( '#part-recv-evm-but-unregister-sender' ).click( function( event ) {
  event.preventDefault();
  $( '#part-recv-evm-but-unregister-sender' ).prop("disabled",true);
  part.unregister1_sender_call();
});

part.unregister1_sender_call = async function() {
  try {
    const provider = new _ethers.providers.Web3Provider(window.ethereum);
    const coininfo = ych.data.coininfos[part.coin];
    const signer = provider.getSigner();
    part.vault = new _ethers.Contract(coininfo.cfg.con, ych.evm_abi_vault, signer);

    const tx = await part.vault.unregister1().then((result) => {

      console.log("result:", result);

      page.clear_error();
      page.show_warn("Wait for the chain...");
      part.wait_unregister1_repeat(result.hash);

    }, (error) => {

        page.show_error(error.reason);
        $( '#part-recv-evm-but-unregister-sender' ).prop("disabled",false);

    });

  } catch(e) {
    console.log("exception:", e);
    page.show_error("Exception happened");
    $( '#part-recv-evm-but-unregister-sender' ).prop("disabled",false);
  }
};

part.wait_unregister1_repeat = async function(txhash) {
  const check_mined = async(txhash) => {
    const provider = new _ethers.providers.Web3Provider(window.ethereum);
    const tx_receipt = await provider.getTransactionReceipt(txhash);
    if (tx_receipt && tx_receipt.blockNumber) {
      page.show_warn("Unregister1 is mined at "+tx_receipt.blockNumber);
      return tx_receipt;
    }
  }
  const is_mined = await check_mined(txhash);
  part.update(part.coin, true);
  if (is_mined) {
    setTimeout(function () {
      page.clear_error();
    }, 2000);
    return;
  }
  setTimeout(function () {
    part.wait_unregister1_repeat(txhash);
  }, 5000);
};

// remove X

part.remove_sender_call = async function(sender_addr) {
  page.clear_error();
  ych.gui.call_with_pass1().then((res) => {
    if (!res.ok) {
      page.show_error(res.msg);
      return;
    }
    part.remove_sender_call_with_pass(sender_addr);
  });
};

part.remove_sender_call_with_pass = async function(sender_addr) {

  try {
    const provider = new _ethers.providers.Web3Provider(window.ethereum);
    let coininfo = ych.data.coininfos[part.coin];
    const signer = provider.getSigner();
    part.vault = new _ethers.Contract(coininfo.cfg.con, ych.evm_abi_vault, signer);
    const ustate2 = await part.vault.ustate();
    const account_addr = await signer.getAddress();

    const user = ych.address[part.coin];
    const sig = ych.evm_sign1(user, ustate2, 0n, account_addr, 0);

    const tx = await part.vault.unregister2(sender_addr, user, sig).then((result) => {

      page.clear_error();
      part.update(part.coin, true);
      part.unregister2_sender_call(sender_addr);

    }, (error) => {
        console.log("sender_addr, user, sig", sender_addr, user, sig);
        page.show_error(error.reason);
    });

  } catch(e) {
    page.show_error("Exception happened");
    console.log("exception:", e);
  }

};

part.unregister2_sender_call = async function(sender_addr) {
  page.clear_error();
  ych.gui.call_with_pass1().then((res) => {
    if (!res.ok) {
      page.show_error(res.msg);
      return;
    }
    part.unregister2_sender_call_with_pass(sender_addr);
  });
};

part.unregister2_sender_call_with_pass = async function(sender_addr) {
  let account_addr = "";
  let block = 0n;
  try {
    let accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length ==0) {
      return "";
    }
    let account = accounts[0];
    if (account == "") {
      return "";
    }
    const provider = new _ethers.providers.Web3Provider(window.ethereum);
    block = await provider.getBlockNumber()+1;
    const signer = provider.getSigner();
    account_addr = await signer.getAddress();
    if (account_addr == "") {
      page.show_error("No selected account");
      return;
    }
  } catch(e) {
    page.show_error("Exception: "+e);
  }

  //console.log("account_addr",account_addr);
  //console.log("block",block);

  // usig
  let call = "unregister2";
  ych.init_coinjs();
  let buftext =
    part.coin+
    call+
    ych.address[part.coin]+
    block.toString()+
    account_addr+
    ych.pubkey1+
    ych.nnum;
  //console.log(buftext);
  let buffer = ych.str2bytes(buftext);
  let hash1 = Crypto.SHA256(buffer, {asBytes: true});
  let hash2 = Crypto.SHA256(hash1, {asBytes: true});
  let tx = coinjs.transaction();
  let wif = coinjs.privkey2wif(ych.prvkey1);
  let sig = tx.transactionSig(0, wif, 1, hash2);
  let exchangeUrl = xybot.network;
  // api call
  $.ajax({
    type: "PUT",
    url: 'https://' + exchangeUrl + window.ych_address_path,
    data: JSON.stringify({
      coin: part.coin,
      call: call,
      user: ych.address[part.coin],
      blck: block,
      sender: account_addr,
      usig: sig
    }),
    dataType: 'json',
    headers: {
      'Authorization': 'Bearer ' + window.getJWT()
    },
    success: function(data) {
      if (data.ok) {
        page.clear_error();
      } else {
        page.show_error(data.error);
        console.log(data);
      }
    },
    error: function(xhr, status, error) {
      page.show_error(status+": "+error);
    }
  });
};

// ERC20

// Allowance

part.select_allowance_percent = function(i) {
  page.clear_error();
  const free = Number(part.account)/1.e8;
  const amount = Number(part.account)/1.e8;
  const amountx = amount * i / 100.;
  part.allowance_to_set = BigInt(Math.floor(0.5 + amountx *1.e8));
  $( '#page-recv-evm-text-set-allow'  ).val(
    (Number(part.allowance_to_set) / 1.e8).toFixed(8)
  );
};

$( '#page-recv-evm-but-allow' ).click( function( event ) {
  event.preventDefault();
  $( '#page-recv-evm-but-allow' ).prop("disabled",true);
  part.set_allowance_call();
});

part.set_allowance_call = async function() {
  try {
    const provider = new _ethers.providers.Web3Provider(window.ethereum);
    const coininfo = ych.data.coininfos[part.coin];
    const signer = provider.getSigner();
    part.erc20 = new _ethers.Contract(coininfo.cfg.coin, ych.evm_abi_erc20, signer);

    let amount = part.allowance_to_set;
    if (!isNaN($( '#page-recv-evm-text-set-allow' ).val()) && $( '#page-recv-evm-text-set-allow' ).val() != "") {
      amount = BigInt(Math.floor(0.5 + parseFloat($( '#page-recv-evm-text-set-allow' ).val()) *1e8));
      part.allowance_to_set_max = false;
    } else {
      part.allowance_to_set_max = true;
    }

    const sat = 10000000000n;
    let allowance_to_set_wei = amount *sat;
    if (part.allowance_to_set_max) {
      allowance_to_set_wei = _ethers.constants.MaxUint256;
    }

    const tx = await part.erc20.approve(coininfo.cfg.con, allowance_to_set_wei).then((result) => {

      console.log("approve is OK");
      $( '#page-recv-evm-but-allow' ).prop("disabled",false);
      page.clear_error();
      page.show_warn("Wait for the chain...");
      part.wait_allowance_set_repeat(_ethers.BigNumber.from(allowance_to_set_wei));

    }, (error) => {

      $( '#page-recv-evm-but-allow' ).prop("disabled",false);
      page.show_error(error.reason);

    });

  } catch(e) {
    $( '#page-recv-evm-but-allow' ).prop("disabled",false);
    page.show_error("Exception happened");
    console.log("exception:", e);
  }
};

part.wait_allowance_set_repeat = function(wait_allowance_wei) {
  part.update(part.coin, true);
  if (wait_allowance_wei.eq(part.allowance_wei)) {
    page.clear_error();
    return;
  }
  setTimeout(function () {
    part.wait_allowance_set_repeat(wait_allowance_wei);
  }, 5000);
};

// Deposit

part.select_deposit_percent = function(i) {
  page.clear_error();
  const free = Number(part.deposit_ready)/1.e8;
  const amount = Number(part.deposit_ready)/1.e8;
  const amountx = amount * i / 100.;
  part.deposit_to_set = BigInt(Math.floor(0.5 + amountx *1.e8));
  $( '#page-recv-evm-text-quantity'  ).val(
    (Number(part.deposit_to_set) / 1.e8).toFixed(8)
  );
};

$( '#page-recv-evm-but-deposit' ).click( function( event ) {
  event.preventDefault();
  $( '#page-recv-evm-but-deposit' ).prop("disabled",true);
  part.deposit_erc20_call();
});

part.deposit_erc20_call = async function() {
  page.clear_error();
  ych.gui.call_with_pass1().then((res) => {
    if (!res.ok) {
      page.show_error(res.msg);
      return;
    }
    part.deposit_erc20_call_with_pass();
  });
};

part.deposit_erc20_call_with_pass = async function() {
  try {
    const provider = new _ethers.providers.Web3Provider(window.ethereum);
    const coininfo = ych.data.coininfos[part.coin];
    const signer = provider.getSigner();

    part.vault = new _ethers.Contract(coininfo.cfg.con, ych.evm_abi_vault, signer);
    const ustate2 = await part.vault.ustate();
    const account_addr = await signer.getAddress();

    let amount = part.deposit_to_set;
    if (!isNaN($( '#page-recv-evm-text-quantity' ).val()) && $( '#page-recv-evm-text-quantity' ).val() != "") {
      amount = BigInt(Math.floor(0.5 + parseFloat($( '#page-recv-evm-text-quantity' ).val()) *1e8));
    } else {
      $( '#page-recv-evm-but-deposit' ).prop("disabled",false);
      page.show_error("Wrong amount");
      return;
    }
    const sat = 10000000000n;
    let deposit_to_set_wei = amount *sat;

    const user = ych.address[part.coin];
    const sig = ych.evm_sign1(user, ustate2, deposit_to_set_wei, account_addr, 0);

    const tx = await part.vault.deposit1(coininfo.cfg.coin, deposit_to_set_wei, user, sig).then((result) => {

      console.log("result:", result);
      console.log("deposit is OK");
      $( '#page-recv-evm-but-deposit' ).prop("disabled",false);
      page.clear_error();
      page.show_warn("Wait for the chain...");
      part.wait_deposit_repeat(result.hash);

    }, (error) => {
      $( '#page-recv-evm-but-deposit' ).prop("disabled",false);
      page.show_error(error.reason);
    });

  } catch(e) {
    $( '#page-recv-evm-but-deposit' ).prop("disabled",false);
    page.show_error("Exception happened");
    console.log("exception:", e);
  }
};

part.wait_deposit_repeat = async function(txhash) {
  const check_mined = async(txhash) => {
    const provider = new _ethers.providers.Web3Provider(window.ethereum);
    const tx_receipt = await provider.getTransactionReceipt(txhash);
    if (tx_receipt && tx_receipt.blockNumber) {
      page.show_warn("Deposit is mined at "+tx_receipt.blockNumber);
      return tx_receipt;
    }
  }
  const is_mined = await check_mined(txhash);
  part.update(part.coin, true);
  if (is_mined) {
    setTimeout(function () {
      page.clear_error();
    }, 2000);
    return;
  }
  setTimeout(function () {
    part.wait_deposit_repeat(txhash);
  }, 5000);
};

// gui

$( '#part-recv-evm-but-copy-deposit-addr' ).click( function( event ) {
  event.preventDefault();
  let coininfo = ych.data.coininfos[part.coin];
  navigator.clipboard.writeText(coininfo.cfg.con);
});

// gui scale account for allowance
$( '#page-recv-evm-text-account' ).mouseenter(function() {
  for (let i=10;i<100;i+=10) {
    $( '#page-recv-evm-text-account-fill-'+i ).addClass('dotslide-on');
  }
});
$( '#page-recv-evm-text-account' ).mouseleave(function() {
  for (let i=10;i<100;i+=10) {
    $( '#page-recv-evm-text-account-fill-'+i ).removeClass('dotslide-on');
  }
});
for (let i=10;i<100;i+=10) {
  $( '#page-recv-evm-text-account-fill-'+i ).mouseenter(function() {
    for (let j=10;j<i;j+=10) {
      $( '#page-recv-evm-text-account-fill-'+j ).addClass('dotslide-on');
    }
  });
  $( '#page-recv-evm-text-account-fill-'+i ).mouseleave(function() {
    for (let j=10;j<i;j+=10) {
      $( '#page-recv-evm-text-account-fill-'+j ).removeClass('dotslide-on');
    }
  });
}

$( '#page-recv-evm-but-max-allow' ).click( function( event ) {
  event.preventDefault();
  //part.allowance_to_set_max = true;
  //$( '#page-recv-evm-text-set-allow'  ).val("MAX");
  part.allowance_to_set_max = false;
  part.select_allowance_percent(100);
});
$( '#page-recv-evm-text-account' ).click(function(event) {
  event.preventDefault();
  part.allowance_to_set_max = false;
  part.select_allowance_percent(100);
});
for (let i=10;i<100;i+=10) {
  $( '#page-recv-evm-text-account-fill-'+i ).click(function(event) {
    event.preventDefault();
    part.allowance_to_set_max = false;
    part.select_allowance_percent(i);
  });
}

// gui scale 'ready' for deposit
$( '#page-recv-evm-text-ready' ).mouseenter(function() {
  for (let i=10;i<100;i+=10) {
    $( '#page-recv-evm-text-ready-fill-'+i ).addClass('dotslide-on');
  }
});
$( '#page-recv-evm-text-ready' ).mouseleave(function() {
  for (let i=10;i<100;i+=10) {
    $( '#page-recv-evm-text-ready-fill-'+i ).removeClass('dotslide-on');
  }
});
for (let i=10;i<100;i+=10) {
  $( '#page-recv-evm-text-ready-fill-'+i ).mouseenter(function() {
    for (let j=10;j<i;j+=10) {
      $( '#page-recv-evm-text-ready-fill-'+j ).addClass('dotslide-on');
    }
  });
  $( '#page-recv-evm-text-ready-fill-'+i ).mouseleave(function() {
    for (let j=10;j<i;j+=10) {
      $( '#page-recv-evm-text-ready-fill-'+j ).removeClass('dotslide-on');
    }
  });
}

$( '#page-recv-evm-but-max-amount' ).click( function( event ) {
  event.preventDefault();
  part.select_deposit_percent(100);
});
$( '#page-recv-evm-text-ready' ).click(function(event) {
  event.preventDefault();
  part.select_deposit_percent(100);
});
for (let i=10;i<100;i+=10) {
  $( '#page-recv-evm-text-ready-fill-'+i ).click(function(event) {
    event.preventDefault();
    part.select_deposit_percent(i);
  });
}

// ws

ych.ws_calls["addressesupdate1"] = function(wsdata) {
  //console.log("addressesupdate1", wsdata);
  const update1 = wsdata.objects[0];
  if (update1.coin != part.coin) {
    return;
  }
  const list = update1.list;
  if (!(part.coin in ych.asset_extra)) {
    ych.asset_extra[part.coin] = {};
    ych.asset_extra[part.coin].senders = [];
  }
  ych.asset_extra[part.coin].senders = list;
  part.update(part.coin, false);
}

});
