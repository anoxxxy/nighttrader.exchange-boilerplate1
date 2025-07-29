/*!
* ych SPA exchange
*
* Copyright Lynxline LLC, yshurik, 2019-2023,
* Common Clause license https://commonsclause.com/
*/

$( function() {

console.log("Init part recv-peg");

let part = function part_recv_peg(is_logged, coin) {
  let coin_pre = part_recv_peg.coin;
  part_recv_peg.coin = coin;

  $( '#page-recv-span-coin-peg' ).text(coin);

  if (coin_pre != coin) {
  }

  part_recv_peg.update(coin);
};
ych.gui.parts["recv"]["peg"] = part;
let page = ych.gui.pages["recv"];

part.on_logout = function() {
  $( '#page-recv-span-addr-peg_t1' ).text("-");
  $( '#page-recv-span-addr-details-peg_t1' ).text("-");
};

part.update = function(coin) {
  if (part.coin == "") {
    $( '#page-recv-span-addr-peg_t1' ).text("-");
    $( '#page-recv-span-addr-details-peg_t1' ).text("-");
    return;
  }

  let coininfo = ych.data.coininfos[part.coin];
  let usdrate = coininfo.ext.priceext;
  let usdext = coininfo.ext.priceext * Number(coininfo.fee.minamount) / 1.e8;

  if (coininfo.type != "peg_t1") {
    $( '#page-recv-div-addr-peg_t1' ).hide();
    return;
  }

  $( '#page-recv-div-addr-peg_t1' ).show();

  $( '#page-recv-span-addr-peg_t1' ).html(ych.address[part.coin]);
  $( '#page-recv-span-addr-details-peg_t1' ).html(
    '<div class="ysmall yleft">'+
    '<br/>Minimum deposit: '+ych.gui.format_amount(coininfo.fee.minamount)+', USD: '+ych.gui.format_usd(usdext)+'<br/>'+
    '</div>'
  );
};

// gui

$( '#page-recv-button-addr-copy-peg_t1' ).click( function( event ) {
  event.preventDefault();
  navigator.clipboard.writeText(ych.address[part.coin]);
});

// ws


});
