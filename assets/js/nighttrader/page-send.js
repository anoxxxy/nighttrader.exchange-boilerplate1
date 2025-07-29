/*!
* ych SPA exchange
*
* Copyright Lynxline LLC, yshurik, 2019-2023,
* Common Clause license https://commonsclause.com/
*/

$( function() {

console.log("Init page send");

ych.gui.parts["send"] = {};
let page = {}
page.page_send = function (is_logged, coin, send_type) {

  let coin_pre = page.coin;
  page.coin = coin;

  if (coin_pre != coin) {
    $( '#page-send-to-email-text-address' ).val("");
    $( '#page-send-to-email-text-quantity' ).val("0.00");
  }

  page.type = send_type;

  if (send_type == "crypto") {
    $( '#page-send-type-email-row-div' ).hide();
    $( '#page-send-type-crypto-row-div' ).show();
    $( '#page-send-type-crypto-button' ).prop("checked", true).trigger("change");
  } else if (send_type == "instant")  {
    $( '#page-send-type-crypto-row-div' ).hide();
    $( '#page-send-type-email-row-div' ).show();
    $( '#page-send-type-email-button' ).prop("checked", true).trigger("change");
  }

  let coininfo = ych.data.coininfos[coin];
  if (coininfo.type == "evm_t1" || coininfo.type == "erc20_t1") {
    ych.gui.table_col_show('page-send-table-sends', 'Timeout');
  } else {
    ych.gui.table_col_hide('page-send-table-sends', 'Timeout');
  }

  page.coin = coin;
  page.update();
};
ych.gui.pages["send"] = page;

page.on_logout = function() {
  ych.gui.table_clear('page-send-table-sends');
};

page.on_coininfo = function(coininfo) {
};

page.on_balance = function(balance) {
  let coin = balance.coin;
  if (coin == page.coin) {
    let balance_txout = balance.txouts;
    if (balance.credit < 0) {
      balance_txout += balance.credit;
    }
    let balance_txout_free = balance_txout - balance.ordersintxouts + balance.offtrade;
    $( '#page-send-to-email-text-free' ).html(ych.gui.format_amount(balance.free));
  }
};

ych.gui.table_init(
  'page-send-table-sends',
  ['N', 'Date', 'Txout', 'Amount-R', 'USD-R', 'Status-C', 'Timeout']
);

page.update_table = function(withdrawspage, coin) {
  let coininfo = ych.data.coininfos[coin];
  ych.gui.table_clear('page-send-table-sends');
  withdrawspage.forEach(function(withdraw, idx) {
    $( '#page-send-table-sends-'+idx+'-N'        ).text(withdraw.uidx);
    $( '#page-send-table-sends-'+idx+'-Date'     ).text(ych.gui.format_date(withdraw.time.made));
    $( '#page-send-table-sends-'+idx+'-Amount-R' ).html(ych.gui.format_amount(-withdraw.vals.amount));
    $( '#page-send-table-sends-'+idx+'-USD-R'    ).html(ych.gui.format_usd(withdraw.vals.usdext));
    if (withdraw.time.stop >0) {
      $( '#page-send-table-sends-'+idx+'-Amount-R' ).html(ych.gui.format_amount_off(-withdraw.vals.amount));
      $( '#page-send-table-sends-'+idx+'-USD-R'    ).html(ych.gui.format_usd_off(withdraw.vals.usdext));
    }
    if (coininfo.type == "evm_t1" || coininfo.type == "erc20_t1") {

      if (withdraw.time.sign>0 && withdraw.time.wait==0 && withdraw.time.stop==0 && withdraw.time.sent==0 &&
        (withdraw.txid=="" || withdraw.txid=="PREPARING")) {

        const now = Math.floor((new Date).getTime() / 1000);
        if (now < withdraw.time.twin) {
          $( '#page-send-table-sends-'+idx+'-Status-C' ).html(
            '<button class="ui-button ui-widget ui-corner-all ybutton ybutton-micro ybutton-red ybutton-20" id="'+
            'page-send-table-sends-'+idx+'-but-bcast">CLICK TO BROADCAST</button>'
          );
          $( '#page-send-table-sends-'+idx+'-but-bcast' ).click( function( event ) {
            event.preventDefault();
            ych.gui.parts.send.evm.on_withdraw_bcast(withdraw);
            ych.gui.parts.send.evm.on_withdraw_bcast_go();
          });
        } else {
          $( '#page-send-table-sends-'+idx+'-Status-C' ).text("TIMEOUT");
        }

      } else {
        $( '#page-send-table-sends-'+idx+'-Status-C' ).text(withdraw.status);
      }
    } else {
      $( '#page-send-table-sends-'+idx+'-Status-C' ).text(withdraw.status);
    }
    if (withdraw.time.stop >0) {
      $( '#page-send-table-sends-'+idx+'-Txout' ).text("");
    } else if (withdraw.txid == "INSTANT") {
      $( '#page-send-table-sends-'+idx+'-Txout' ).text(withdraw.txid);
    } else {
      let txid = withdraw.txid;
      if (txid.startsWith("0x")) {
        txid = txid.substring(2);
      }
      $( '#page-send-table-sends-'+idx+'-Txout' ).html(
        ych.gui.format_txout_link1(withdraw.coin, txid, withdraw.nout, 0)
      );
    }
    if (withdraw.time.twin >0) {
      $( '#page-send-table-sends-'+idx+'-Timeout' ).text(ych.gui.format_date(withdraw.time.twin));
    } else {
      $( '#page-send-table-sends-'+idx+'-Timeout' ).text("");
    }
  });
};

$( '#page-send-button-back' ).click( function( event ) {
  event.preventDefault();
  window.history.back();
});

// switch types of send

$( '#page-send-type-crypto-row-div' ).hide(); // default

$( '#page-send-type-email-button' ).on("change", function( event ) {
  event.preventDefault();
  if (page.type == "instant") return;
  window.ych_navigate('#send-'+page.coin+'-instant');
});

$( '#page-send-type-crypto-button' ).on("change", function( event ) {
  event.preventDefault();
  if (page.type == "crypto") return;
  window.ych_navigate('#send-'+page.coin+'-crypto');
});

// updates

page.update = function() {
  const coin = page.coin;
  let prev_coin = "";

  $( '#page-send-to-email-label-quantity' ).text(coin);
  $( '#page-send-to-email-label-total'    ).text(coin);
  $( '#page-send-to-email-label-free'     ).text(coin);
  $( '#page-send-to-email-label-fee'      ).text(coin);

  $( '#page-send-to-email-button-send'     ).text("Send "+coin);

  let withdraws = [];
  if (ych.data.profile != null) {
    if (coin in ych.data.profile.withdraws) {
      withdraws = ych.data.profile.withdraws[coin];
    }
  }
  page.update_table(withdraws, coin);

  if (ych.data.profile != null && coin in ych.data.profile.balances) {
    let balance = ych.data.profile.balances[coin];
    $( '#page-send-to-email-text-free' ).html(ych.gui.format_amount(balance.free));
  } else {
    $( '#page-send-to-email-text-free' ).text("");
  }
};


ych.ws_calls["addwithdraw"] = function(wsdata) {

  //let balances = wsdata.objects[0];
  //balances.forEach(function(balance, idx) {
  //  ych.gui.update_balance(balance);
  //});

  let addwithdraw = wsdata.objects[1];
  let withdrawspage = ych.data.profile.withdraws[addwithdraw.coin];

  // index to be greater
  withdrawspage.forEach(function(withdraw, idx) {
    if (withdraw.uidx >= addwithdraw.uidx) {
      return; // looks like a message for old withdraw
    }
  });

  // add as first and slice to pagesize
  withdrawspage.unshift(addwithdraw);
  withdrawspage = withdrawspage.slice(0,ych.gui.pagesize);
  ych.data.profile.withdraws[addwithdraw.coin] = withdrawspage;

  if (addwithdraw.coin == page.coin) {
    page.update_table(withdrawspage, addwithdraw.coin);
  }
};

ych.ws_calls["regwithdraw"] = function(wsdata) {

  //let balances = wsdata.objects[0];
  //balances.forEach(function(balance, idx) {
  //  ych.gui.update_balance(balance);
  //});

  let regwithdraw = wsdata.objects[1];
  let withdrawspage = ych.data.profile.withdraws[regwithdraw.coin];

  withdrawspage.forEach(function(withdraw, idx) {
    if (regwithdraw.uidx == withdraw.uidx) {
      withdrawspage[idx] = regwithdraw;
      withdraw = regwithdraw;
    }
  });

  if (regwithdraw.coin == page.coin) {
    page.update_table(withdrawspage, regwithdraw.coin);
  }

  let coininfo = ych.data.coininfos[regwithdraw.coin];
  if (coininfo.type == "evm_t1" || coininfo.type == "erc20_t1") {
    ych.gui.parts.send.evm.on_withdraw_bcast(regwithdraw);
  }
};


});
