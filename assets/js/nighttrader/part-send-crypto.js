/*!
* ych SPA exchange
*
* Copyright Lynxline LLC, yshurik, 2019-2023,
* Common Clause license https://commonsclause.com/
*/

$( function() {

console.log("Init part send-crypto");

let part = {};
part.part_send_crypto = function(is_logged, coin) {
  let coin_pre = part.coin;

  part.mode = "reduce";
  part.free = 0n;
  part.sendfee = 0n;
  part.datatag = 0n;
  part.datatag_calc = 0n;

  part.op1 = part.makeop();
  part.op2 = part.makeop();
  part.op3 = part.makeop();

  const coininfo = ych.data.coininfos[coin];
  if (coininfo.type == "txout_t1") {
    part.datatag_calc = 1n;
  }

  part.update_gui(coin);
  part.coin = coin;
  part.update();
};
ych.gui.parts["send"]["crypto"] = part;
/*
part.show_error = function (msg) {
  xy_fn.JBoxDialog.setTitle('ERROR');
  xy_fn.JBoxDialog.setContent(msg);
  xy_fn.JBoxDialog.open();
}

part.show_warn = function (msg) {
  xy_fn.JBoxDialog.setTitle('WARNING');
  xy_fn.JBoxDialog.setContent(msg);
  xy_fn.JBoxDialog.open();
}

part.clear_error = function (msg) {
   xy_fn.JBoxDialog.close();
}

*/
// watch for datas:
// coininfo data: fees changes
// balance data: changes
// txouts data: changes

part.on_coininfo = function(coininfo) {
  if (coininfo.coin != part.coin) return;
  part.update();
};

part.on_balance = function(balance) {
  if (balance.coin != part.coin) return;
  part.update();
};

part.on_txouts = function(data) {
  if (data.coin != part.coin) return;
  {
    part.debit_txouts_num = 0;
    part.debit_txouts_val = 0n;
    part.debit_txouts_credit = 0n;
    part.debit_txouts_serv = [];
    part.debit_txouts_known = false;
    part.debit_txouts_for_debit = 0n;
  }
  part.update();
};

part.trace = function(tag, op) {
  return;
  if (!ych.gui.prefs_txouts_debug) { return; }
  console.log(tag+
    " T,i:"+op.num_inps +",o:"+op.num_outs+
    ",ai:"+op.amount_inp+",ao:"+op.amount_out+
    ",ch:"+op.change    +",cr:"+op.credit+",de:"+op.debit+
    ",nf:"+op.netfee);
};

part.stabilize_op = function(op) /*err*/ {
  part.trace("stabilize_op", op);

  let min = 0n;
  const coininfo = ych.data.coininfos[part.coin];
  if (coininfo.type == "txout_t1") { min = coininfo.fee.minamount; }

  let err = op.stabilize(coininfo, min);
  part.trace("stabilize_op end", op);
  if (err != null) { return err; }
  return null;
}

part.update = function() {
  if (ych.data.profile == null) { return; }
  part.datatag = 0n;
  if (part.op2.amount_inp != 0n) { part.datatag = part.datatag_calc; }
  part.op2.reduce_mode = (part.mode == "reduce");
  part.op3.reduce_mode = true;
  part.update_txout_debit_virtual();
  part.set_txouts();
  part.show_ready_amount();
  let err = part.op1.select1(part.sendfee, part.op2);
  if (err!=null) {
    return part.show_error_and_refresh(err);
  }
  err = part.select_txouts2();
  if (err!=null) {
    return part.show_error_and_refresh(err);
  }
  err = part.stabilize_op(part.op2);
  if (err!=null) {
    return part.show_error_and_refresh(err);
  }
  if (part.validate_aux_addresses()) {
    if (part.mode == "reduce") {
      $( '#page-send-to-crypto-text-quantity'  ).val(
        (Number(part.op2.amount_out) / 1.e8).toFixed(8)
      );
    }
    if (part.validate_all_q()) {
      part.show_ready();
    }
  }
  part.refresh_gui();
};

part.select_amount_percent = function(i) {
  part.clear_error();
  const coininfo = ych.data.coininfos[part.coin];
  const free = Number(part.free)/1.e8;
  const amountf = Number(part.free)/1.e8;
  const amountx = amountf * i / 100.;
  part.op1.amount_inp = BigInt(Math.floor(0.5 + amountx *1.e8));
  part.op2.amount_inp = BigInt(Math.floor(0.5 + amountx *1.e8));
  part.datatag = 0n;
  if (part.op2.amount_inp != 0n) { part.datatag = part.datatag_calc; }
  part.sendfee = BigInt(Math.floor(0.5 + amountx *coininfo.fee.withfee *1.e8));
  part.mode = "reduce";
  part.op2.reduce_mode = true;
  part.op3.reduce_mode = true;
  part.refresh_table_txouts1();
  let err = part.op1.select1(part.sendfee, part.op2);
  if (err!=null) {
    return part.show_error_and_refresh(err);
  }
  err = part.select_txouts2();
  if (err!=null) {
    return part.show_error_and_refresh(err);
  }
  err = part.stabilize_op(part.op2);
  if (err!=null) {
    return part.show_error_and_refresh(err);
  }
  if (part.validate_aux_addresses()) {
    const withdrawAmount = (Number(part.op2.amount_out) / 1.e8).toFixed(8);
    $( '#page-send-to-crypto-text-quantity'  ).val(withdrawAmount);
    //added by anoxy
    $('#withdraw .page-send-quantity-xy').val(withdrawAmount)
    
    if (part.validate_all_q()) {
      part.show_ready();
    }
  }
  part.refresh_gui();
};

part.edit_quantity = function() {
  part.clear_error();
  if (!part.validate_quantity()) return;
  part.op1.amount_inp = ych.gui.get_input_amount('page-send-to-crypto-text-quantity');
  part.op2.amount_inp = ych.gui.get_input_amount('page-send-to-crypto-text-quantity');
  part.datatag = 0n;
  if (part.op2.amount_inp != 0n) { part.datatag = part.datatag_calc; }
  const coininfo = ych.data.coininfos[part.coin];
  const amountx = Number(part.op1.amount_inp)/1.e8;
  part.sendfee = BigInt(Math.floor(0.5 + amountx *coininfo.fee.withfee *1.e8));
  part.mode = "manual";
  part.op2.reduce_mode = false;
  part.op3.reduce_mode = true;
  part.refresh_table_txouts1();
  let err = part.op1.select1(part.sendfee, part.op2);
  if (err!=null) {
    return part.show_error_and_refresh(err);
  }
  err = part.select_txouts2();
  if (err!=null) {
    return part.show_error_and_refresh(err);
  }
  err = part.stabilize_op(part.op2);
  if (err!=null) {
    return part.show_error_and_refresh(err);
  }
  if (part.validate_aux_addresses()) {
    if (part.validate_all_q()) {
      part.show_ready();
    }
  }
  part.refresh_gui();
};

part.update_txout_debit_virtual = function() {
  let debit = 0n;
  let ordersindebit = 0n;
  if (part.coin in ych.data.profile.balances) {
    const balance = ych.data.profile.balances[part.coin];
    debit = balance.debit;
    ordersindebit = balance.ordersindebit;
  }
  part.txout_debit_virtual = {
    "gidx":1,
    "cidx":1,
    "coin":part.coin,
    "hold":2,
    "state":500,
    "addr":{
      "vers":1,
      "host":"",
      "addr":ych.address[part.coin],
      "pub1":ych.pubkey3,
      "pub2":ych.pubkey2,
      "lck1":0,
      "lck2":0,
      "pksc":"",
      "rdsc":"00"
    },
    "txid":ych.zerotxid,
    "nout":0,
    "free":debit-ordersindebit,
    "orders":0n,
    "amount":debit-ordersindebit,
    "filled":0n,
    "selected":0n
  };
  const coininfo = ych.data.coininfos[part.coin];
  if (coininfo.type == "peg_t1") {
    // peg_t1 is comlete virtual, treat orders as filled
    part.txout_debit_virtual.amount = debit;
    part.txout_debit_virtual.orders = 0n;
    part.txout_debit_virtual.filled = ordersindebit;
  }
}

part.set_txouts = function() {
  part.set_txouts_user(part.op1);
  part.set_txouts_debit(part.op1);
  part.op1.make_id2idx();
  // compute available
  part.free = 0n;
  part.op1.txouts.forEach(function(txout, idx) { part.free += txout.free; });
  // txouts2
  part.set_txouts_user(part.op2);
  part.set_txouts_debit(part.op2);
  part.op2.make_id2idx();
};

part.set_txouts_user = function(op) {
  if (!(part.coin in ych.data.profile.txouts)) {
    op.txouts_user = [];
    return;
  }
  op.txouts_user = JSON.parse(
    JSON.stringify(ych.data.profile.txouts[part.coin], (key, value) =>
      typeof value === "bigint" ? value.toString() + "n" : value
    ),
    jsonBNparse
  ); // deep copy
  // only usable+locked/expired
  // sort input from max-to-min available amount
  op.txouts_user = op.txouts_user.filter(txout => (
    (txout.state == 400 /* || txout.state == 500 TODO: to withdraw with offtrade */))
  );
  op.txouts_user.sort(function(a, b) { return Number(b.free - a.free); });
  // assign as first part of txouts
  op.txouts = op.txouts_user;
};

part.set_txouts_debit = function(op) {
  if (!(part.coin in ych.data.profile.balances)) {
    return;
  }
  const balance = ych.data.profile.balances[part.coin];
  if (balance.debit <=0) {
    return;
  }
  op.txouts_debit = [];
  const coininfo = ych.data.coininfos[part.coin];
  if (coininfo.type != "peg_t1" &&
      coininfo.type != "evm_t1" &&
      coininfo.type != "txout_t1" &&
      coininfo.type != "erc20_t1") {
      return;
  }
  const debit = (balance.debit-balance.ordersindebit);
  if (debit == 0n) {
    return;
  }
  op.txouts_debit = JSON.parse(
    JSON.stringify([part.txout_debit_virtual], (key, value) =>
      typeof value === "bigint" ? value.toString() + "n" : value
    ),
    jsonBNparse
  ); // deep copy
  op.txouts = op.txouts.concat(op.txouts_debit);
};

part.select_txouts2 = function() /*err*/ {
  if (part.mode == "reduce") {
    let free = 0n;
    part.op2.txouts.forEach(function(txout) { free += txout.free; });
    if (free < part.op2.amount_inp) { part.op2.amount_inp = free; }
  }
  let err = part.op2.select2(part.op2.amount_inp);
  if (err!=null) { return err; }

  if (part.mode =="reduce") {
    part.op2.reduce(part.datatag);
  } else {
    part.op2.change -= part.datatag;
  }
  return null;
};

part.validate_inputs_outputs_q = function() {
  part.clear_error();
  let inputs_val =0n;
  part.op2.selected.forEach(function(txout, idx) { inputs_val += txout.amount; });
  let outs_total = part.op2.amount_out+part.op2.change+part.op2.credit+part.datatag+part.op2.netfee;
  if (inputs_val != outs_total) {
    part.show_error("Can not configure inputs(6), change the quantity");
    return false;
  }
  return true;
};

part.validate_quantity = function() {
  part.clear_error();
  if (isNaN($( '#page-send-to-crypto-text-quantity' ).val()) ||
      $( '#page-send-to-crypto-text-quantity' ).val() == "") {
    part.show_error("Quantity is not a number");
    return false;
  }
  return true;
};
part.validate_quantity_q = function() {
  if (isNaN($( '#page-send-to-crypto-text-quantity' ).val()) ||
      $( '#page-send-to-crypto-text-quantity' ).val() == "") {
    return false;
  }
  return true;
};

part.validate_address1 = function(addr_text, show_error) {
  if (addr_text == "") {
    return false;
  }
  const coininfo = ych.data.coininfos[part.coin];
  if (coininfo.type == "txout_t1") {
    ych.init_coinjs(part.coin);
    try {
      let addr_obj = coinjs.addressDecode(addr_text);
      if (addr_obj == false) {
        if (show_error) { part.show_error("Address is not recognized(1)"); }
        return false;
      }
      if (addr_obj.type == "bech32") {
        if (show_error) { part.show_error("Address type bech32 is not yet supported"); }
        return false;
      }
      if (addr_obj.type == "other") {
        if (show_error) { part.show_error("Address is not recognized(2)"); }
        return false;
      }
    } catch(e) {
      return false;
    }
  }
  if (coininfo.type == "peg_t1") {
    ych.init_coinjs(part.coin);
    try {
      let addr_obj = coinjs.addressDecode(addr_text);
      if (addr_obj == false) {
        if (show_error) { part.show_error("Address is not recognized(1)"); }
        return false;
      }
      if (addr_obj.type == "bech32") {
        if (show_error) { part.show_error("Address type bech32 is not supported"); }
        return false;
      }
      if (addr_obj.type == "other") {
        if (show_error) { part.show_error("Address is not recognized(2)"); }
        return false;
      }
    } catch(e) {
      return false;
    }
  }
  if (coininfo.type == "evm_t1" || coininfo.type == "erc20_t1") {
    if (!_ethers.utils.isAddress(addr_text)) {
      if (show_error) { part.show_error("Address is not recognized"); }
      return false;
    }
  }
  return true;
};
part.validate_address = function() {
  part.clear_error();
  let addr_text = $( '#page-send-to-crypto-text-address' ).val();
  if (!part.validate_address1(addr_text, true)) {
    return false;
  }
  if (part.validate_all_q()) {
    part.show_ready();
  }
  return true;
};
part.validate_address_q = function() {
  let addr_text = $( '#page-send-to-crypto-text-address' ).val();
  return part.validate_address1(addr_text, false);
};

part.validate_totals_q = function() {
  if (part.op2.amount_inp <= 0n) return false;
  if (part.op2.amount_out <= 0n) return false;

  let inputs_val =0n;
  part.op2.selected.forEach(function(txout, idx) { inputs_val += txout.amount; });
  let outputs_val = part.op2.amount_out+part.op2.change+part.op2.credit+part.datatag+part.op2.netfee;
  if (inputs_val != outputs_val) return false;

  return true;
};

part.validate_aux_addresses = function() {
  { // the change
    let addr_text = ych.address[part.coin];
    if (!part.validate_address1(addr_text, true)) {
      return false;
    }
  }
  const coininfo = ych.data.coininfos[part.coin];
  if (coininfo.type == "txout_t1") {
    { // the credit
      let multi = coinjs.pubkeys2MultisigAddressWithBackup(
        ych.pubkey3,
        ych.pubkey2,
        0, 0);
      if (!part.validate_address1(multi.address, true)) {
        return false;
      }
    }
  }
  return true;
};

part.validate_all_q = function() {
  if (!part.validate_inputs_outputs_q()) return false;
  if (!part.validate_quantity_q()) return false;
  if (!part.validate_address_q()) return false;
  if (!part.validate_totals_q()) return false;
  return true;
};

$( '#page-send-to-crypto-text-address' ).on("input", part.validate_address);
$( '#page-send-to-crypto-text-quantity' ).on("input", part.edit_quantity);

part.make_tx = function(op) {

  part.addr_send = $( '#page-send-to-crypto-text-address' ).val();
  part.addr_change = ych.address[part.coin];
  part.addr_credit = "";

  const coininfo = ych.data.coininfos[part.coin];
  if (coininfo.type == "txout_t1") {

    ych.init_coinjs(part.coin);
    let rbf = null;
    if (coinjs.maxrbf >0) {
      rbf = coinjs.maxrbf-1;
    }

    let tx = coinjs.transaction();

    for (let i=0; i< op.selected.length; i++) {
      let txout = op.selected[i];
      // prev address
      let multi = coinjs.pubkeys2MultisigAddressWithBackup(
        txout.addr.pub1,
        txout.addr.pub2,
        txout.addr.lck1,
        txout.addr.lck2);
      let rbf_inp = rbf;
      if (txout.hold==2) {
        rbf_inp = txout.nseq;
      }
      tx.addinput(txout.txid, txout.nout, Crypto.util.hexToBytes(multi.redeemScript), rbf_inp, txout.amount);
    }

    if (op.amount_out > 0n) {
      tx.addoutput(part.addr_send, op.amount_out);
    }

    if (op.change > 0n) {
      tx.addoutput(part.addr_change, op.change);
    }

    let multi = coinjs.pubkeys2MultisigAddressWithBackup(
      ych.pubkey3,
      ych.pubkey2,
      0, 0);
    part.addr_credit = multi.address;
    if (op.credit > 0n) {
      tx.addoutput(part.addr_credit, op.credit);
    }

    let buf = [];
    op.selected.forEach(function(txout) {
      let txid_buf = Crypto.util.hexToBytes(txout.txid).reverse();
      for(let i =0; i< txid_buf.length; i++) { buf.push(txid_buf[i]); }
      let nout_buf = coinjs.numToBytes(txout.nout);
      for(let i =0; i< nout_buf.length; i++) { buf.push(nout_buf[i]); }
    });
    buf.push("L".charCodeAt(0));
    for(let i =0; i< part.addr_send.length; i++) { buf.push(part.addr_send.charCodeAt(i)); }
    let valu_buf = coinjs.numToBytes(Number(op.amount_out));
    for(let i =0; i< valu_buf.length; i++) { buf.push(valu_buf[i]); }
    console.log("Notary buf:", Crypto.util.bytesToHex(buf));
    var hash = Crypto.SHA256(Crypto.SHA256(buf, {asBytes: true}), {asBytes: true});
    let notary = "XCH:0:"+Crypto.util.bytesToHex(hash.reverse());
    console.log("Notary:", notary);
    tx.adddata(Crypto.util.bytesToHex(ych.str2bytes(notary)), 1);

    op.rawtx = tx.serialize();
    op.tx = tx;
  }
};

$( '#page-send-to-crypto-button-preview' ).click( function( event ) {
  event.preventDefault();
  part.make_tx(part.op2);
  $( '#form-tx-preview-textarea-rawtx' ).val(part.op2.rawtx);
  ych.gui.forms["send-crypto-preview1"].exec();
});

$( '#page-send-to-crypto-button-send' ).click( function( event ) {
  event.preventDefault();
  part.clear_error();
  ych.gui.call_with_pass1().then((res) => {
    if (!res.ok) {
      part.show_error(res.msg);
      return;
    }
    part.make_withdraw(part.op1, part.op2);
  });
});

part.make_withdraw = function(op1, op2) {

  const coininfo = ych.data.coininfos[part.coin];

  part.make_tx(op2);
  ych.init_coinjs();
  const wif = coinjs.privkey2wif(ych.prvkey1);

  const tw = Math.floor((new Date).getTime() / 1000) +coininfo.cfg.tw;
  const twn = BigInt(tw);

  let signed_txinps1 = [];
  let signed_txinps2 = [];
  let buftext_usetxouts1 = "";
  let buftext_usetxouts2 = "";

  if (coininfo.type == "txout_t1") {

    for (let i=0; i< op1.selected.length; i++) {
      const txout = op1.selected[i];
      // usig
      buftext_usetxouts1 += txout.txid+":"+txout.nout;
      buftext_usetxouts1 += txout.filled.toString();
      buftext_usetxouts1 += txout.selected.toString();
      // sig
      const [signed_txinp,err] = ych.sign_txout(txout);
      if (err != null) {
        part.show_error(err);
        return;
      }
      //console.log("signed_txinp", signed_txinp);
      signed_txinps1.push(signed_txinp);
    }

    console.log(op2.tx);
    for (let i=0; i< op2.selected.length; i++) {
      const txout = op2.selected[i];
      // usig
      buftext_usetxouts2 += txout.txid+":"+txout.nout;
      buftext_usetxouts2 += txout.filled.toString();
      buftext_usetxouts2 += txout.selected.toString();
      // sig
      let sigf = "";
      let sign = "";
      let sigv = 0n;

      ych.init_coinjs(part.coin);
      const hash_type = 1; // SIGHASHALL
      sigf = op2.tx.transactionSig(i, wif, hash_type);
      const hash = op2.tx.transactionHash(i, hash_type);
      console.log(i, "S:", sigf.slice(0,10), "P:", ych.pubkey1.slice(0,10), "H:", hash.slice(0,10));

      // array
      let signed_txinp = {};
      signed_txinp.txid = txout.txid;
      signed_txinp.nout = txout.nout;
      signed_txinp.amnt = txout.amount;
      signed_txinp.fill = txout.filled;
      signed_txinp.usea = txout.selected;
      signed_txinp.sigf = sigf;
      signed_txinp.sign = sign;
      signed_txinp.sigv = sigv;
      signed_txinps2.push(signed_txinp);
    }

  }

  if (coininfo.type == "peg_t1") {

    for (let i=0; i< op2.selected.length; i++) {
      const txout = op2.selected[i];
      // usig
      buftext_usetxouts2 += txout.txid+":"+txout.nout;
      buftext_usetxouts2 += txout.filled.toString();
      buftext_usetxouts2 += txout.selected.toString();
      // sig
      let sigf = "";
      let sign = "";
      let sigv = 0n;
      // array
      let signed_txinp = {};
      signed_txinp.txid = txout.txid;
      signed_txinp.nout = txout.nout;
      signed_txinp.amnt = txout.amount;
      signed_txinp.fill = txout.filled;
      signed_txinp.usea = txout.selected;
      signed_txinp.sigf = sigf;
      signed_txinp.sign = sign;
      signed_txinp.sigv = sigv;
      signed_txinps2.push(signed_txinp);
    }

  }

  if (coininfo.type == "evm_t1" || coininfo.type == "erc20_t1") {

    const sat = 10000000000n;

    // op1
    for (let i=0; i< op1.selected.length; i++) {
      const txout = op1.selected[i];
      // usig
      buftext_usetxouts1 += txout.txid+":"+txout.nout;
      buftext_usetxouts1 += txout.filled.toString();
      buftext_usetxouts1 += txout.selected.toString();
      // sig
      const state1 = "0x"+txout.txid;

      const txout_sign = txout.orders +txout.filled +txout.selected;
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
      signed_txinp.usea = txout.selected;
      signed_txinp.sigf = "";
      signed_txinp.sigv = txout_sign;
      signed_txinp.sigs = sigs;
      signed_txinps1.push(signed_txinp);
    }

    // op2
    console.log("op2 inputs:", op2.selected);
    let txout_state = null;
    let txout_debit = null;
    let txouts_states_num = 0;
    let txouts_debits_num = 0;
    op2.selected.forEach(function(txout, idx) {
      if (txout.txid ==ych.zerotxid) {
        txouts_debits_num++;
        txout_debit = txout;
      } else {
        txouts_states_num++;
        txout_state = txout;
      }
    });
    if (txouts_states_num > 1) {
      part.show_error("More than one state: unfinished chain operations, try later");
      return;
    }
    if (txouts_debits_num > 1) {
      part.show_error("More than one debit, error");
      return;
    }

    op2.selected.forEach(function(txout, idx) {

      // usig
      buftext_usetxouts2 += txout.txid+":"+txout.nout;
      buftext_usetxouts2 += txout.filled.toString();
      buftext_usetxouts2 += txout.selected.toString();

      let sigf = "";
      let sign = "";
      let sigv = 0n;

      if (txout.txid ==ych.zerotxid) {

      } else {

        sigv = txout.selected;
        const usea_wei = txout.selected *sat;

        const state1 = "0x"+txout.txid;
        sigf = ych.evm_sign1(
          ych.address[part.coin],
          state1,
          usea_wei,
          part.addr_send, tw);

        console.log(ych.address[part.coin], state1, usea_wei, part.addr_send, tw);

        // next state, deduct value to send
        const state2_amount_wei = BigInt(txout.amntbn) -usea_wei;
        let f_next_state = ych.evm_next_state1;
        if (part.coin == "TETH2") {
          f_next_state = ych.evm_next_state1_old_v2;
        }
        if (part.coin == "TDAI2") {
          f_next_state = ych.evm_next_state1_old_v2;
        }
        const state2 = f_next_state(
          state1,
          part.addr_send,
          usea_wei,
          state2_amount_wei, twn);

        console.log("state2:", state2);
        console.log(`state2 args -  state1: ${state1}, part.addr_send: ${part.addr_send}, usea_wei: ${usea_wei}, state2_amount_wei: ${state2_amount_wei}, twn: ${twn}`);

        // next sign, orders+filled+fee
        const state2_signed = txout.orders +txout.filled;
        const state2_signed_wei = state2_signed *sat;
        sign = ych.evm_sign1(
          ych.address[part.coin],
          state2,
          state2_signed_wei,
          ych.evm_zeroaddr,
          txout.nout+1);
      }

      let signed_txinp = {};
      signed_txinp.txid = txout.txid;
      signed_txinp.nout = txout.nout;
      signed_txinp.amnt = txout.amount;
      signed_txinp.fill = txout.filled;
      signed_txinp.usea = txout.selected;
      signed_txinp.sigf = sigf;
      signed_txinp.sign = sign;
      signed_txinp.sigv = sigv;
      signed_txinp.sigs = [];
      signed_txinps2.push(signed_txinp);

    });
  }

  // usig
  let buftext =
    part.coin+
    part.addr_send+
    part.addr_credit+
    part.addr_change+
    op2.amount_out.toString()+
    op2.debit.toString()+
    op2.credit.toString()+
    op2.change.toString()+
    op2.netfee.toString()+
    part.sendfee.toString()+
    buftext_usetxouts1+
    buftext_usetxouts2+
    ych.pubkey1+
    ych.nnum;
  console.log("buftext:", buftext);
  let buffer = ych.str2bytes(buftext);
  let hash1 = Crypto.SHA256(buffer, {asBytes: true});
  let hash2 = Crypto.SHA256(hash1, {asBytes: true});
  ych.init_coinjs();
  let tx = coinjs.transaction();
  let sig = tx.transactionSig(0, wif, 1, hash2);

  const pass_coin = part.coin;
  const pass_addr_send = part.addr_send;
  const pass_value_send = op2.amount_out;

  let exchangeUrl = xybot.network;

  $.ajax({
    type: "PUT",
    url: 'https://' + exchangeUrl + window.ych_withdraw_path,
    data: JSON.stringify(
      {
        coin: part.coin,
        addr_send: part.addr_send,
        addr_credit: part.addr_credit,
        addr_change: part.addr_change,
        value_send: op2.amount_out,
        value_debit: op2.debit,
        value_credit: op2.credit,
        value_change: op2.change,
        value_netfee: op2.netfee,
        value_sendfee: part.sendfee,
        usetxouts1: signed_txinps1,
        usetxouts2: signed_txinps2,
        twin: twn,
        usig: sig
      }, (key, value) =>
      typeof value === "bigint" ? value.toString() + "n" : value
    ),
    dataType: 'text',
    headers: {
      'Authorization': 'Bearer ' + window.getJWT()
    },
    success: function(datastr) {
      const data = JSON.parse(datastr, jsonBNparse);
      console.log(data);
      if (!data.ok) {
        part.show_error(data.error);
        return;
      }

      if (data.step == "txouts") {

        console.log("txouts STEP");

        // txouts3
        part.set_txouts_user(part.op3);
        part.op3.txouts_debit = data.txouts;
        part.op3.txouts = part.op3.txouts.concat(part.op3.txouts_debit);
        part.op3.make_id2idx();

        console.log("part.op3 x0", part.op3);

        let err = part.op3.select3(part.op2.amount_out);
        if (err!=null) {
          return part.show_error_and_refresh(err);
        }
        console.log("part.op3 x1", part.op3);
        if (part.op3.change >0n) {
          part.op3.change -= part.datatag;
        } else {
          part.op3.reduce(part.datatag);
        }

        console.log("part.op3 x2", part.op3);

        err = part.stabilize_op(part.op3)
        console.log("part.op3 stabilize_op err:", err);
        if (err!=null) {
          return part.show_error_and_refresh(err);
        }

        console.log("part.op3 x3", part.op3);

        part.refresh_gui();

        ych.gui.forms["send-adj"].exec().then((res) => {
          console.log("res:", res);
          if (!res.ok) {
            return;
          }
          part.make_withdraw(part.op1, part.op3);
        });

      } else {

        part.clear_error();
        $( '#page-send-to-crypto-text-address' ).val("");
        $( '#page-send-to-crypto-text-quantity' ).val("0.0");
        part.edit_quantity();
        if (coininfo.type == "evm_t1" || coininfo.type == "erc20_t1") {
          let withdraw = {};
          withdraw.gidx = data.gidx;
          withdraw.coin = pass_coin;
          withdraw.addr = pass_addr_send;
          withdraw.vals = {};
          withdraw.vals.amount = pass_value_send;
          ych.gui.parts.send.evm.on_withdraw_wait(withdraw);
        }
      }
    },
    error: function(xhr, status, error) {
      part.show_error(status+": "+error);
    }
  });
};

});
