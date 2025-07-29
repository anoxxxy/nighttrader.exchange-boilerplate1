/*!
* ych SPA exchange
*
* Copyright Lynxline LLC, yshurik, 2019-2023,
* Common Clause license https://commonsclause.com/
*/

$( function() {

console.log("Init part send-evm");


//Withdrawal Modal - Preparing Withdrawal
const modalWeb3Wait = new jBox('Confirm', {
  //attach: '#Modal-1',
  height: 'auto',
  title: "Withdraw - Preparing the Transaction...",
  content: $('#form-web3-wait').clone(true),
  //footer: '<div class="text-end"><button class="btn btn-danger">Close</button></div>',
  footer: '<div class="text-center">Please wait for the Transaction to be prepared...</div>',

  draggable: 'title',
  reposition: true,
  repositionOnContent: true,
  closeOnEsc: false,
  closeOnClick: false,
  closeButton: false,
  confirmButton: "Okay...",
  cancelButton: "Cancel...",
  showCancelButton: false,
  //showConfirmButton: true,
  onInit: function () {
    this.options.content[0].classList.remove('hidden'); //display the web3 content
    console.log('init modalWeb3Wait dialog');
  },
  onOpen: function () {
    console.log('open modalWeb3Wait dialog');
  },
  confirm: function () {
    console.log('modalWeb3Wait - Confirm clicked!');
  },
  onClose: function () {
    console.log('close modalWeb3Wait dialog');
    part.now_waiting = false;
  },
});

//Withdrawal Modal - Withdrawal Broadcast/Send with Confirm/Cancel buttons
const modalWeb3Send = new jBox('Confirm', {
  //attach: '#Modal-1',
  height: 'auto',
  title: "Withdrawal - Send Transaction...",
  content: $('#form-web3').clone(true),
  //footer: '<div class="text-end"><button class="btn btn-danger">Close</button></div>',
  footer: '<div class="text-center">Confirm or Cancel your Transaction!</div>',

  draggable: 'title',
  reposition: true,
  repositionOnContent: true,
  closeOnEsc: false,
  closeOnClick: false,
  closeButton: false,
  confirmButton: "Confirm...",
  cancelButton: "Cancel...",
  showCancelButton: true,
  //showConfirmButton: true,
  onInit: function () {
    this.options.content[0].classList.remove('hidden'); //display the web3 content
    console.log('init modalWeb3Send dialog');
  },
  onOpen: function () {
    console.log('open modalWeb3Send dialog');
  },
  confirm: function () {
    console.log('modalWeb3Send - Confirm clicked!');
    part.on_withdraw_bcast_go();
  },
  cancel: function () {
    console.log('modalWeb3Send - Cancel clicked!');
    part.cancel_withdraw_go();
  },
  onClose: function () {
    console.log('close modalWeb3Send dialog');
    part.now_waiting = false;
  },
});


//Main functions for interaction with Metamask
let part = {};
part.part_send_evm = function (is_logged, coin) {
  let coin_pre = part.coin;
  part.coin = coin;
  part.now_waiting = false;
  part.now_sending = false;

  modalWeb3Send.options.content.find('#form-web3-span-coin' ).text(coin);

  part.update();
};
ych.gui.parts["send"]["evm"] = part;

part.update = async function() {
    if (part.coin == "" || part.coin == undefined) {
    modalWeb3Send.options.content.find('#form-web3-span-coin' ).text('-');
    modalWeb3Send.options.content.find('#form-web3-evm-span-send-coin' ).text('-');
    return;
  }

  const coininfo = ych.data.coininfos[part.coin];
  const usdrate = coininfo.ext.priceext;
  const usdext = coininfo.ext.priceext * Number(coininfo.fee.minamount) / 1.e8;

  if (coininfo.type != "evm_t1" && coininfo.type != "erc20_t1") {
    modalWeb3Send.options.content.find('#form-web3-div-addr-evm_t1' ).hide();
    modalWeb3Send.options.content.find('#form-web3-button-bcast' ).prop("disabled",true);
    return;
  }

  if (!(part.coin in ych.address) || ych.address[part.coin] == "") {
    modalWeb3Send.options.content.find('#form-web3-div-addr-evm_t1' ).hide();
    modalWeb3Send.options.content.find('#form-web3-button-bcast' ).prop("disabled",true);
    return;
  }

  modalWeb3Send.options.content.find('#form-web3-div-addr-evm_t1' ).show();

  modalWeb3Send.options.content.find('#form-web3-span-net-name' ).text(coininfo.cfg.net+" ChainId="+coininfo.cfg.netid);
  modalWeb3Send.options.content.find( '#form-web3-but-switch-net' ).text("Switch network to "+coininfo.cfg.net+" ChainId="+coininfo.cfg.netid);

  // check ethereum
  if (typeof window.ethereum == 'undefined') {
    modalWeb3Send.options.content.find('#form-web3-span-provider-detected' ).text("NO");
    modalWeb3Send.options.content.find('#form-web3-span-provider-chainid' ).text("-");
    modalWeb3Send.options.content.find('#form-web3-div-provider' ).hide();
    modalWeb3Send.options.content.find('#form-web3-button-bcast' ).prop("disabled",true);
    return;
  }

  modalWeb3Send.options.content.find('#form-web3-div-provider' ).show();
  modalWeb3Send.options.content.find('#form-web3-span-provider-detected' ).text("YES");
  modalWeb3Send.options.content.find('#form-web3-span-provider-chainid' ).text(window.ethereum.chainId);

  if (parseInt(window.ethereum.chainId, 16) != coininfo.cfg.netid) {
    modalWeb3Send.options.content.find('#form-web3-but-switch-net' ).show();
    modalWeb3Send.options.content.find('#form-web3-div-account' ).hide();
    modalWeb3Send.options.content.find('#form-web3-button-bcast' ).prop("disabled",true);
    return;
  }

  // on right network
  modalWeb3Send.options.content.find('#form-web3-but-switch-net' ).hide();
  modalWeb3Send.options.content.find('#form-web3-div-account' ).show();

  let account = await part.get_ethereum_account_address();
  //console.log("get_ethereum_account", account);

  if (account == "") {
    modalWeb3Send.options.content.find('#form-web3-span-account' ).text("-");
    modalWeb3Send.options.content.find('#form-web3-but-connect-account' ).show();
    modalWeb3Send.options.content.find('#form-web3-button-bcast' ).prop("disabled",true);
    return;
  }

  // has account connected
  modalWeb3Send.options.content.find('#form-web3-but-connect-account' ).hide();
  let short = account.substr(0,6)+"..."+account.substr(account.length-4,account.length);
  modalWeb3Send.options.content.find('#form-web3-span-account' ).text(short);
  modalWeb3Send.options.content.find('#form-web3-button-bcast' ).prop("disabled",false);
};

part.check_ethereum_netid = function() {
  part.update(part.coin);
};

part.check_ethereum_netid_repeat = function() {
  part.check_ethereum_netid();
  setTimeout(function () {
    part.check_ethereum_netid_repeat();
  }, 5000);
};
part.check_ethereum_netid_repeat();

modalWeb3Send.options.content.find('#form-web3-but-switch-net' ).click( function( event ) {
  event.preventDefault();
  
  modalWeb3Send.options.content.find('#form-web3-but-switch-net' ).prop("disabled",true);
  const coininfo = ych.data.coininfos[part.coin];
  part.switch_ethereum_net("0x"+coininfo.cfg.netid.toString(16));
});

part.switch_ethereum_net = async function(netid) {
  await window.ethereum.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: netid }]
  });
  modalWeb3Send.options.content.find('#form-web3-but-switch-net' ).prop("disabled",false);
  setTimeout(function () { // lets 1 sec wait
    part.check_ethereum_netid();
  }, 1000);
};

modalWeb3Send.options.content.find('#form-web3-but-connect-account' ).click( function( event ) {
  event.preventDefault();
  modalWeb3Send.options.content.find('#form-web3-but-connect-account' ).prop("disabled",true);
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
      modalWeb3Send.options.content.find('#form-web3-span-account' ).text("<no_address>");
      modalWeb3Send.options.content.find('#form-web3-but-connect-account' ).prop("disabled",false);
      return;
    }
    let account = accounts[0];
    if (account == "") {
      modalWeb3Send.options.content.find('#form-web3-span-account' ).text("<no_address>");
      modalWeb3Send.options.content.find('#form-web3-but-connect-account' ).prop("disabled",false);
      return;
    }
    const provider = new _ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const addr = signer.getAddress();
    const short = addr.substr(0,6)+"..."+addr.substr(addr.length-4,addr.length);
    modalWeb3Send.options.content.find('#form-web3-span-account' ).text(addr);
  } catch(e) {
  }
  modalWeb3Send.options.content.find('#form-web3-but-connect-account' ).prop("disabled",false);
};

part.clear_error = function() {
  modalWeb3Send.options.content.find('#form-web3-box-err' ).addClass("hidden").text('\u00A0');
  iziToast.destroy();
};

part.show_error = function(err) {
  modalWeb3Send.options.content.find('#form-web3-box-err' ).removeClass("hidden").text(err);
  modalWeb3Send.open();
  iziToast.error({
    icon: 'ti ti-alert-circle',
    title: 'Error',
    message: `${err}`,
  });
};

/*
part.dialog_web3_wait = $( '#form-web3-wait' ).dialog({
  autoOpen: false,
  height: 300,
  width: 500,
  modal: true,
  buttons: [
    {
      text: "Close",
      click: function() {
        console.log("xxxy");
        //part.form_web3_wait[0].reset();
        part.now_waiting = false;
        part.dialog_web3_wait.dialog("close");
      }
    }
  ],
  close: function() {
    //part.form_web3_wait[0].reset();
    part.now_waiting = false;
  }
});
part.form_web3_wait = part.dialog_web3_wait.find('form').on("submit", function(event) {
  event.preventDefault();
  part.dialog_web3_wait.dialog("close");
  modalWeb3Wait.close();
  part.now_waiting = false;
});
*/

part.on_withdraw_wait = async function(withdraw) {
  if (part.now_sending) { return; }
  if (part.now_waiting) { return; }

  const coininfo = ych.data.coininfos[withdraw.coin];
  const usdrate = coininfo.ext.priceext;

  modalWeb3Wait.options.content.find( '.form-web3-div-receiver' ).text(withdraw.addr);
  modalWeb3Wait.options.content.find( '.form-web3-span-quantity-coin' ).text(withdraw.coin);
  modalWeb3Wait.options.content.find( '.form-web3-div-quantity' ).html(ych.gui.format_amount(withdraw.vals.amount));
  modalWeb3Wait.options.content.find( '.form-web3-div-usd' ).html(ych.gui.format_usd((Number(withdraw.vals.amount) / 1.e8 *usdrate).toFixed(2)));
  
  modalWeb3Send.options.content.find('.form-web3-div-receiver' ).text(withdraw.addr);
  modalWeb3Send.options.content.find('.form-web3-span-quantity-coin' ).text(withdraw.coin);
  modalWeb3Send.options.content.find('.form-web3-div-quantity' ).html(ych.gui.format_amount(withdraw.vals.amount));
  modalWeb3Send.options.content.find('.form-web3-div-usd' ).html(ych.gui.format_usd((Number(withdraw.vals.amount) / 1.e8 *usdrate).toFixed(2)));

  /*
  $( '.form-web3-div-receiver' ).text(withdraw.addr);
  $( '.form-web3-span-quantity-coin' ).text(withdraw.coin);
  $( '.form-web3-div-quantity' ).html(ych.gui.format_amount(withdraw.vals.amount));
  $( '.form-web3-div-usd' ).html(ych.gui.format_usd((Number(withdraw.vals.amount) / 1.e8 *usdrate).toFixed(2)));
  */
  

  part.now_waiting = true;
  part.now_sending_withdraw = withdraw;
  //part.dialog_web3_wait.dialog('option', 'title', "Wait. Preparing to broadcast: "+"withdraw-"+withdraw.gidx);
  //part.dialog_web3_wait.dialog("open");
  modalWeb3Wait.setTitle("Withdraw - Preparing to Broadcast: "+"withdraw-"+withdraw.gidx + ". Please wait ...").open();
}

/*part.dialog_web3 = $( '#form-web3' ).dialog({
  autoOpen: false,
  height: 400,
  width: 500,
  modal: true,
  buttons: [
    {
      id: "form-web3-button-bcast",
      text: "Broadcast Transaction",
      class: "ui-button ui-widget ui-corner-all ybutton",
      click: function() {
        part.on_withdraw_bcast_go();
      }
    },
    {
      text: "Cancel the Withdraw",
      click: function() {
        part.cancel_withdraw_go();
      }
    }
  ],
  close: function() {
    //part.form_web3[0].reset();
    part.now_sending = false;
  }
});

part.form_web3 = part.dialog_web3.find('form').on("submit", function(event) {
  event.preventDefault();
  part.dialog_web3.dialog("close");
  part.now_sending = false;
});
*/

part.on_withdraw_bcast = async function(withdraw) {
  console.log("part.on_withdraw_bcast", withdraw);

  if (part.now_waiting) {
    //part.dialog_web3_wait.dialog("close");
    modalWeb3Wait.close();
    part.now_waiting = false;
  }

  if (withdraw.time.wait >0) {
    if (part.now_sending) {
      //part.dialog_web3.dialog("close");
      modalWeb3Send.close();
      part.now_sending = false;
    }
    return;
  }

  if (withdraw.time.sent >0 || (withdraw.txid != "PREPARING" && withdraw.txid != "")) {
    console.log("x1");
    if (part.now_sending) {
      //part.dialog_web3.dialog("close");
      modalWeb3Send.close();
      part.now_sending = false;
    }
    return;
  }

  const now = Math.floor((new Date).getTime() / 1000);
  if (now > withdraw.time.twin) {
    console.log("x2");
    if (part.now_sending) {
      //part.dialog_web3.dialog("close");
      modalWeb3Send.close();
      part.now_sending = false;
    }
    return;
  }

  if (part.now_sending) {
    console.log("x3");
    return;
  }
  
  modalWeb3Send.setTitle("Withdraw - Confirm Transaction ID: "+"withdraw-"+withdraw.gidx).open();
  
  const coininfo = ych.data.coininfos[withdraw.coin];
  const usdrate = coininfo.ext.priceext;

  modalWeb3Send.options.content.find('#form-web3-div-receiver' ).text(withdraw.addr);
  modalWeb3Send.options.content.find('#form-web3-span-quantity-coin' ).text(withdraw.coin);
  modalWeb3Send.options.content.find('#form-web3-div-quantity' ).html(ych.gui.format_amount(withdraw.vals.amount));
  modalWeb3Send.options.content.find('#form-web3-div-usd' ).html(ych.gui.format_usd((Number(withdraw.vals.amount) / 1.e8 *usdrate).toFixed(2)));

  part.now_sending = true;
  part.now_sending_withdraw = withdraw;
  part.update(withdraw.coin);
  //part.dialog_web3.dialog('option', 'title', "Ready to broadcast: "+"withdraw-"+withdraw.gidx);
  //part.dialog_web3.dialog("open");
  
  modalWeb3Send.setTitle("Withdraw - Confirm Transaction ID: "+"withdraw-"+withdraw.gidx).open();
  //modalWeb3Send.open();
  

  return;
};

part.on_withdraw_bcast_go = async function() {
  const withdraw = part.now_sending_withdraw;
  console.log("part.on_withdraw_bcast_go", withdraw);

  try {

    console.log("x1");
    const provider = new _ethers.providers.Web3Provider(window.ethereum);
    const coininfo = ych.data.coininfos[part.coin];
    const signer = provider.getSigner();
    part.vault = new _ethers.Contract(coininfo.cfg.con, ych.evm_abi_vault, signer);

    console.log("x2");
    const user = ych.address[part.coin];
//    const ustate1 = "0x"+withdraw.inps[0].txid;
//    const ustate2 = await part.vault.states(coininfo.cfg.coin, user);
//    if (ustate1 != ustate2) {
//      part.show_error("Vault contract state changed");
//      console.log(ustate1, "vs", ustate2);
//      return;
//    }

    console.log("x3");
    const dest = withdraw.addr;
    const sig2 = withdraw.inps[0].sig2;

    const sat = 10000000000n;
    let uses = [];
    withdraw.inps.forEach(function(inp, idx) {
      const addr = inp.addr;
      const use_val = inp.usea *sat;
      const sig1_rev = inp.sigr;
      let sig1_val = inp.sigv *sat;
      let sig1 = inp.sig1;
      if (sig1 == "") {
        sig1 = "0x";
        sig1_val = 0n;
      }
      const use = [addr, use_val, sig1, sig1_rev, sig1_val];
      uses.push(use);
    });
    const tw = withdraw.time.twin;
    console.log("x4");

    part.now_sending = true;

    console.log("CALL:" ,coininfo.cfg.coin, user, dest, uses, sig2, tw);

    const tx = await part.vault.withdraw1(coininfo.cfg.coin, user, dest, uses, sig2, tw).then((res1) => {

      console.log("res1:", res1);
      let exchangeUrl = xybot.network;
      $.ajax({
        type: "PUT",
        url: 'https://' + exchangeUrl + window.ych_withdraw_evm_txid,
        data: JSON.stringify(
          {
            coin: part.coin,
            gidx: withdraw.gidx,
            txid: res1.hash
          }, (key, value) =>
          typeof value === "bigint" ? value.toString() + "n" : value
        ),
        dataType: 'json',
        headers: {
          'Authorization': 'Bearer ' + window.getJWT()
        },
        success: function(data) {
          console.log(data);
          if (data.ok) {

            // txid reported, ok to close
            part.clear_error();
            //part.dialog_web3.dialog("close");
            modalWeb3Wait.close();
            modalWeb3Send.close();
            part.now_sending = false;

          } else {
            part.show_error(data.error);
          }
        },
        error: function(xhr, status, error) {
          part.show_error(status+": "+error);
        }
      });

    }, (error) => {
        part.show_error("Error: "+error.reason);

        console.log(error);
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
    part.show_error("Exception happened");
    console.log("exception:", e);
  }

};

part.cancel_withdraw_go = async function() {
  part.clear_error();
  ych.gui.call_with_pass1().then((res) => {
    if (!res.ok) {
      part.show_error(res.msg);
      return;
    }
    part.cancel_withdraw_go_with_pass();
  });
};

part.cancel_withdraw_go_with_pass = async function() {

  const withdraw = part.now_sending_withdraw;
  console.log("cancel_withdraw_go", withdraw);

  const coininfo = ych.data.coininfos[part.coin];

  // usig
  ych.init_coinjs();
  const buftext =
    part.coin+
    withdraw.gidx+
    ych.pubkey1+
    ych.nnum;
  console.log("buftext:", buftext);
  const buffer = ych.str2bytes(buftext);
  const hash1 = Crypto.SHA256(buffer, {asBytes: true});
  const hash2 = Crypto.SHA256(hash1, {asBytes: true});
  const tx = coinjs.transaction();
  const wif = coinjs.privkey2wif(ych.prvkey1);
  const sig = tx.transactionSig(0, wif, 1, hash2);

  let exchangeUrl = xybot.network;

  $.ajax({
    type: "PUT",
    url: 'https://' + exchangeUrl + window.ych_nowithdraw_path,
    data: JSON.stringify(
      {
        coin: part.coin,
        gidx: withdraw.gidx,
        usig: sig
      }, (key, value) =>
      typeof value === "bigint" ? value.toString() + "n" : value
    ),
    dataType: 'json',
    headers: {
      'Authorization': 'Bearer ' + window.getJWT()
    },
    success: function(data) {
      console.log(data);
      if (data.ok) {

        // all ok, can close the dialog
        //part.dialog_web3.dialog( "close" );
        modalWeb3Wait.close();
        modalWeb3Send.close();
        part.now_sending = false;

      } else {
        part.show_error(data.error);
      }
    },
    error: function(xhr, status, error) {
      part.show_error(status+": "+error);
    }
  });

  return;
};



});
