/*!
* ych SPA exchange
*
* Copyright Lynxline LLC, yshurik, 2019-2023,
* Common Clause license https://commonsclause.com/
*/

$( function() {

console.log("Init part recv-txout");

let part = function part_recv_txout(is_logged, coin) {
  let coin_pre = part_recv_txout.coin;
  part_recv_txout.coin = coin;

  $( '#page-recv-span-coin-txout' ).text(coin);

  if (coin_pre != coin) {
  }

  part_recv_txout.update(coin);
};
ych.gui.parts["recv"]["txout"] = part;
let page = ych.gui.pages["recv"];

part.on_logout = function() {
  $( '#page-recv-span-addr-txout_t1' ).text("-");
  $( '#page-recv-span-addr-details-txout_t1' ).text("-");
};

part.update = function(coin) {
  if (part.coin == "") {
    $( '#page-recv-span-addr-txout_t1' ).text("-");
    $( '#page-recv-span-addr-details-txout_t1' ).text("-");
    return;
  }

  let coininfo = ych.data.coininfos[part.coin];
  let usdrate = coininfo.ext.priceext;
  let usdext = coininfo.ext.priceext * Number(coininfo.fee.minamount) / 1.e8;

  if (coininfo.type != "txout_t1") {
    $( '#page-recv-div-addr-txout_t1' ).hide();
    return;
  }

  $( '#page-recv-div-addr-txout_t1' ).show();

  if (ych.locktime1[part.coin] == 0) {
    $( '#page-recv-span-addr-txout_t1' ).html(ych.address[part.coin]);
    $( '#page-recv-span-addr-details-txout_t1' ).html(
      '<div class="ysmall yleft">'+
      '<br/>Minimum deposit: '+ych.gui.format_amount(coininfo.fee.minamount)+', USD: '+ych.gui.format_usd(usdext)+'<br/>'+
      '<br/>Locktime1: none (user)'+
      '<br/>Locktime2: none (exchange)'+
      '</div>'
    );
  } else {
    $( '#page-recv-span-addr-txout_t1' ).html(ych.address[part.coin]);
    $( '#page-recv-span-addr-details-txout_t1' ).html(
      '<div class="ysmall yleft">'+
      '<br/>Minimum deposit: '+ych.gui.format_amount(coininfo.fee.minamount)+', USD: '+ych.gui.format_usd(usdext)+'<br/>'+
      '<br/>Locktime1: '+ych.gui.format_date(ych.locktime1[part.coin])+' (user)'+
      '<br/>Locktime2: '+ych.gui.format_date(ych.locktime2[part.coin])+' (exchange)'+
      '</div>'
    );
  }
};

// gui

$( '#page-recv-button-addr-copy-txout_t1' ).click( function( event ) {
  event.preventDefault();
  navigator.clipboard.writeText(ych.address[part.coin]);
});

// ws


});
