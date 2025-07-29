/*!
* ych SPA exchange
*
* Copyright Lynxline LLC, yshurik, 2019-2023,
* Common Clause license https://commonsclause.com/
*/

$( function() {

console.log("Init part send-instant");

let part = {};
part.part_send_instant = function (is_logged, coin) {
  let coin_pre = part.coin;

  if (coin_pre != coin) {
  }

  part.coin = coin;
  part.update_fees();
};
ych.gui.parts["send"]["instant"] = part;

$( '#page-send-to-email-button-send' ).prop("disabled",true);

part.clear_error = function() {
  $( '#page-send-to-email-box-err' ).css("background-color", "rgba(0,0,0,0)");
  $( '#page-send-to-email-box-err' ).text('\u00A0');
};

part.show_error = function(err) {
  $( '#page-send-to-email-box-err' ).css("background-color", "rgba(255,0,0,0.25)");
  $( '#page-send-to-email-box-err' ).text(err);
};

part.on_coininfo = function(coininfo) {
  if (coininfo.coin != part.coin) return;
  part.update_fees();
};

part.update_fees = function() {
  let coin = part.coin;

  let amount = 0n;
  if (!isNaN($( '#page-send-to-email-text-quantity' ).val()) && $( '#page-send-to-crypto-text-quantity' ).val() != "") {
    amount = Math.floor(0.5 + parseFloat($( '#page-send-to-crypto-text-quantity' ).val()) *1e8);
  }

  const coininfo = ych.data.coininfos[coin];
  const usdrate = coininfo.ext.priceext;

  const fee_mul = coininfo.fee.sendfee;
  const fee = Math.floor(0.5 + amount * fee_mul);
  const total = amount + fee;

  $( '#page-send-to-email-head-fee' ).text("Send Fee "+(fee_mul*100.).toFixed(2)+"%:");

  $( '#page-send-to-email-text-fee'  ).html(
    '<span class="ysemi">'+
    "≈$"+
    (fee / 1.e8 *usdrate).toFixed(2)+
    '</span>'+
    " "+
    ych.gui.format_amount(BigInt(fee)));

  $( '#page-send-to-email-text-total' ).html(
    '<span class="ysemi">'+
    "≈$"+
    (total / 1.e8 *usdrate).toFixed(2)+
    '</span>'+
    " "+
    ych.gui.format_amount(BigInt(total)));

  return fee;
};

part.validate_fields = function() {

  if (isNaN($( '#page-send-to-email-text-quantity' ).val()) || $( '#page-send-to-email-text-quantity' ).val() == "") {
    $( '#page-send-to-email-text-total' ).text("-");
    $( '#page-send-to-email-button-withdraw' ).prop("disabled",true);
    return;
  }

  const coin = part.coin;
  const coininfo = ych.data.coininfos[coin];
  const usdrate = coininfo.ext.priceext;
  const fee_mul = coininfo.fee.sendfee;
  const send_min = coininfo.fee.minorder;
  let amount = Math.floor(0.5 + parseFloat($( '#page-send-to-email-text-quantity' ).val()) *1e8);
  let fee = Math.floor(0.5 + amount * fee_mul);
  let total = amount + fee;

  part.clear_error();

  $( '#page-send-to-email-text-fee'  ).html(
    '<span class="ysemi">'+
    "≈$"+
    (fee / 1.e8 *usdrate).toFixed(2)+
    '</span>'+
    " "+
    ych.gui.format_amount(BigInt(fee)));

  $( '#page-send-to-email-text-total' ).html(
    '<span class="ysemi">'+
    "≈$"+
    (total / 1.e8 *usdrate).toFixed(2)+
    '</span>'+
    " "+
    ych.gui.format_amount(BigInt(total)));

  let balance = ych.data.profile.balances[coin];
  let balance_can_send = balance.free;

  if (total > balance_can_send) {
    $( '#page-send-to-email-button-send' ).prop("disabled",true);
    part.show_error("Total is over available coins");
    return;
  }

  // check destination address
  let email = $( '#page-send-to-email-text-address' ).val();
  let emailok = ych.gui.check_email(email);
  if (!emailok) {
    $( '#page-send-to-email-button-send' ).prop("disabled",true);
    part.show_error("Address is not recognized");
    return;
  }

  $( '#page-send-to-email-button-send' ).prop("disabled",false);
  part.clear_error();
};

$( '#page-send-to-email-text-address' ).on("input", part.validate_fields);
$( '#page-send-to-email-text-quantity' ).on("input", part.validate_fields);

$( '#page-send-to-email-button-send' ).click( function( event ) {
  event.preventDefault();
  part.clear_error();
  ych.gui.call_with_pass1().then((res) => {
    if (!res.ok) {
      part.show_error(res.msg);
      return;
    }
    part.make_send();
  });
});

part.make_send = function() {

  const coin = part.coin;
  const change_addr = ych.address[coin];
  if (change_addr == "") {
    part.show_error("Not available the change address");
    return;
  }

  const email = $( '#page-send-to-email-text-address' ).val();
  const coininfo = ych.data.coininfos[coin];
  const fee_mul = coininfo.fee.sendfee;
  const coin_min = coininfo.fee.minamount;
  const send_min = coininfo.fee.minorder;
  const amount = ych.gui.get_input_amount('page-send-to-email-text-quantity');
  const fee = BigInt(Math.floor(0.5 + Number(amount) * fee_mul));
  const total = amount + fee;

  let total_via_debit = 0n;
  let total_via_txouts = total;

  let balance = ych.data.profile.balances[coin];

  if (total > balance.free) {
    part.show_error("Not enough coins");
    return;
  }

  if (balance.debit >0) {

    let can_use_from_debit = balance.debit - balance.ordersindebit;
    if (can_use_from_debit <0) {
      part.show_error("Error debt usage is negative");
      return;
    }
    if (can_use_from_debit >= total) {
      total_via_debit = total;
      total_via_txouts = 0n;
    } else if (can_use_from_debit > 0) {
      total_via_debit = can_use_from_debit;
      total_via_txouts = total - can_use_from_debit;
    }
  }

  let signed_txinps = [];

  if (total_via_txouts > 0) {

    console.log("total_via_txouts", total_via_txouts);

    // client side to use txouts and make signatures
    let txouts = JSON.parse(
      JSON.stringify(ych.data.profile.txouts[coin], (key, value) =>
        typeof value === "bigint" ? value.toString() + "n" : value
      ),
      jsonBNparse
    ); // deep copy

    ych.init_coinjs(coin);

    // expanded to include past=800,usable=400,futures=350(?)
    const txouts_evm = txouts.filter(txout => (
      txout.state == 350 || txout.state == 400 || txout.state == 800)
    );
    // only usable=400
    // sort input from min-to-max available amount, ready for select
    txouts = txouts.filter(txout => (txout.state == 400));
    txouts.sort(function(a, b) { return Number(a.free - b.free); });

    if (coininfo.type == "txout_t1") {

      const [txouts_selected,
        txouts_selected_free,
        txouts_selected_orders,
        txouts_selected_filled] = ych.txout_select_inps(txouts, total_via_txouts);

      if (txouts_selected_free <0n || txouts_selected_free < total_via_txouts) {
        part.show_error("send: not enough available coins in txouts to use "+total_via_txouts);
        return;
      }

      console.log("selected txouts:",
        txouts_selected,
        txouts_selected_free,
        txouts_selected_orders,
        txouts_selected_filled);

      for (let i=0; i<txouts_selected.length; i++) {
        const txout = txouts_selected[i];
        const [signed_txinp,err] = ych.sign_txout(txout);
        if (err != null) {
          part.show_error(err);
          return;
        }
        signed_txinps.push(signed_txinp);
      }
    }

    if (coininfo.type == "evm_t1" || coininfo.type == "erc20_t1") {

      const sat = 10000000000n;
      let amount = total_via_txouts;

      for (let i=0; i<txouts_evm.length; i++) {

        const txout = txouts_evm[i];
        const state1 = "0x"+txout.txid;
        const txout_sign = txout.orders +txout.filled +amount;
        const txout_sign_wei = txout_sign *sat;

        const sig = ych.evm_sign1(
          ych.address[part.coin],
          state1,
          txout_sign_wei,
          ych.evm_zeroaddr,
          txout.nout+1);
        const sigs = [sig];

        let signed_txinp = {};
        signed_txinp.txid = txout.txid;
        signed_txinp.nout = txout.nout;
        signed_txinp.amnt = txout.amount;
        signed_txinp.fill = txout.filled;
        signed_txinp.usea = amount;
        signed_txinp.sigf = "";
        signed_txinp.sigv = txout_sign;
        signed_txinp.sigs = sigs;
        signed_txinps.push(signed_txinp);
      }
    }
  }

  // usig
  let buftext_usetxouts = "";
  signed_txinps.forEach(function(txout, idx) {
    buftext_usetxouts += txout.txid+":"+txout.nout;
    buftext_usetxouts += txout.fill.toString();
    buftext_usetxouts += txout.usea.toString();
  });
  ych.init_coinjs();
  let buftext =
    coin+
    email+
    amount.toString()+
    fee.toString()+
    total_via_debit.toString()+
    buftext_usetxouts+
    ych.pubkey1+
    ych.nnum;
  //console.log("buftext:", buftext);
  let buffer = ych.str2bytes(buftext);
  let hash1 = Crypto.SHA256(buffer, {asBytes: true});
  let hash2 = Crypto.SHA256(hash1, {asBytes: true});
  let tx = coinjs.transaction();
  let wif = coinjs.privkey2wif(ych.prvkey1);
  let sig = tx.transactionSig(0, wif, 1, hash2);

  $.ajax({
    type: "PUT",
    url: "/u/send",
    data: JSON.stringify(
      {
        coin: coin,
        addr: email,
        amount: amount,
        fee: fee,
        usedebit: total_via_debit,
        usetxouts: signed_txinps,
        usig: sig
      }, (key, value) =>
      typeof value === "bigint" ? value.toString() + "n" : value
    ),
    dataType: 'json',
    success: function(data) {
      console.log(data);
      if (data.ok) {
        part.clear_error();
        $( '#page-send-to-email-text-address' ).val("");
        $( '#page-send-to-email-text-quantity' ).val("0.0");
      } else {
        part.show_error(data.error);
      }
    },
    error: function(xhr, status, error) {
      part.show_error(status+": "+error);
    }
  });
};

});
