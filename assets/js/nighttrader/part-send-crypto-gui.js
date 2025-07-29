/*!
* ych SPA exchange
*
* Copyright Lynxline LLC, yshurik, 2019-2023,
* Common Clause license https://commonsclause.com/
*/

$( function() {

console.log("Init part send-crypto-gui");

const part = ych.gui.parts["send"]["crypto"];

$( '#page-send-to-crypto-button-preview' ).prop("disabled",true);
$( '#page-send-to-crypto-button-send' ).prop("disabled",true);

ych.gui.table_init(
  'page-send-part-crypto-table-txouts1',
  ['N', 'txout-C', 'amount-R', 'free-R', 'orders-R', 'indebt-R', 'use-R']
);
ych.gui.table_init(
  'page-send-part-crypto-table-txouts2',
  ['N', 'txout-C', 'amount-R', 'free-R', 'orders-R', 'indebt-R', 'use-R'], 1
);
ych.gui.table_init(
  'page-send-part-crypto-table-txouts3',
  ['N', 'txout-C', 'amount-R', 'free-R', 'orders-R', 'indebt-R', 'use-R'], 1
);

ych.gui.table_init(
  'page-send-to-crypto-outs-table',
  ['N', 'amount-R', 'to'], 10
);

$( '#page-send-to-crypto-text-free' ).mouseenter(function() {
  for (let i=10;i<100;i+=10) {
    $( '#page-send-to-crypto-text-free-fill-'+i ).addClass('dotslide-on');
  }
});
$( '#page-send-to-crypto-text-free' ).mouseleave(function() {
  for (let i=10;i<100;i+=10) {
    $( '#page-send-to-crypto-text-free-fill-'+i ).removeClass('dotslide-on');
  }
});
for (let i=10;i<100;i+=10) {
  $( '#page-send-to-crypto-text-free-fill-'+i ).mouseenter(function() {
    for (let j=10;j<i;j+=10) {
      $( '#page-send-to-crypto-text-free-fill-'+j ).addClass('dotslide-on');
    }
  });
  $( '#page-send-to-crypto-text-free-fill-'+i ).mouseleave(function() {
    for (let j=10;j<i;j+=10) {
      $( '#page-send-to-crypto-text-free-fill-'+j ).removeClass('dotslide-on');
    }
  });
}

part.update_gui = function(coin) {
  let coin_pre = part.coin;
  $( '#withdraw .coin_withdraw' ).text(coin);
  $( '#page-send-to-crypto-label-quantity' ).text(coin);
  $( '#page-send-to-crypto-label-sendfee'  ).text(coin);
  $( '#page-send-to-crypto-label-netfee'   ).text(coin);
  $( '#page-send-to-crypto-label-total'    ).text(coin);
  $( '#page-send-to-crypto-label-free'     ).text(coin);
  $( '#page-send-to-crypto-button-send'    ).text("Sign and Send "+coin);

  $( '#form-send-adj-span-quantity-coin' ).text(coin);
  $( '#form-send-adj-span-sendfee-coin'  ).text(coin);
  $( '#form-send-adj-span-netfee-coin'   ).text(coin);
  $( '#form-send-adj-span-total-coin'    ).text(coin);

  if (coin_pre != coin) {
    $( '#page-send-to-crypto-text-address'  ).val("");
    $( '#page-send-to-crypto-text-quantity' ).val("0.00");
  }

  const coininfo = ych.data.coininfos[coin];

  if (coininfo.type == "evm_t1" || coininfo.type == "erc20_t1") {
    $( '#page-send-to-crypto-button-preview' ).hide();
    $( '#page-send-to-crypto-label-netfee'   ).text("-");
    $( '#page-send-part-crypto-table-txouts1-head-state' ).text("State");
  }
  if (coininfo.type == "peg_t1") {
    $( '#page-send-to-crypto-button-preview' ).hide();
    $( '#page-send-part-crypto-table-txouts1-head-state' ).text("Txout1");
  }
  if (coininfo.type == "txout_t1") {
    if (ych.gui.prefs_txouts_debug) {
      $( '#page-send-to-crypto-button-preview' ).show();
    } else {
      $( '#page-send-to-crypto-button-preview' ).hide();
    }
    $( '#page-send-part-crypto-table-txouts1-head-state' ).text("Txout1");
  }

  //TMP
  //if (coininfo.coin == "TBTC") {
  //  $( '#page-send-to-crypto-text-address' ).val("2N2qqZE6fdUivDysUmDjWyxubBL8rr1mX4s");
  //}
};

part.show_ready_amount = function() {
  const coininfo = ych.data.coininfos[part.coin];
  const usdrate = coininfo.ext.priceext;
  const balance_free = Number(part.free) / 1.e8;

  $( '#page-send-to-crypto-text-free'  ).html(
    '<span class="ysemi">'+
    "≈$"+
    (balance_free  *usdrate).toFixed(2)+
    '</span>'+
    " "+
    ych.gui.format_amount(part.free));

  

  $('#withdraw .page-send-to-crypto-text-free-xy').text('≈$'+(balance_free  *usdrate).toFixed(2));
  $('#withdraw .page-send-to-crypto-balance-xy').val(balance_free);

  //$('#withdraw .page-send-to-crypto-text-free-xy').html(ych.gui.format_amount(part.free));

};

part.refresh_table_txouts1 = function() {
  ych.gui.table_clear('page-send-part-crypto-table-txouts1');
  // pre-resize
  let n=0;
  part.op1.txouts.forEach(function(txout, idx) { n++; });
  ych.gui.table_resize('page-send-part-crypto-table-txouts1', n);
  // fill data
  part.op1.txouts.forEach(function(txout, i) {
    $( '#page-send-part-crypto-table-txouts1-'+i+'-txout-C'  ).html(ych.gui.format_txout_link2(part.coin, txout.txid, txout.nout, txout.state));
    $( '#page-send-part-crypto-table-txouts1-'+i+'-amount-R' ).html(ych.gui.format_amount_or_empty(txout.amount));
    $( '#page-send-part-crypto-table-txouts1-'+i+'-free-R'   ).html(ych.gui.format_amount_or_empty(txout.free));
    $( '#page-send-part-crypto-table-txouts1-'+i+'-orders-R' ).html(ych.gui.format_amount_or_empty(txout.orders));
    $( '#page-send-part-crypto-table-txouts1-'+i+'-indebt-R' ).html(ych.gui.format_amount_or_empty(txout.filled));
  });
};

part.refresh_table_txouts2 = function() {
  ych.gui.table_clear('page-send-part-crypto-table-txouts2');
  // pre-resize
  let n=0;
  part.op2.txouts.forEach(function(txout, idx) { n++; });
  ych.gui.table_resize('page-send-part-crypto-table-txouts2', n+2);
  // fill data
  part.op2.txouts.forEach(function(txout, i) {
    $( '#page-send-part-crypto-table-txouts2-'+i+'-txout-C'  ).html(ych.gui.format_txout_link2(part.coin, txout.txid, txout.nout, txout.state));
    $( '#page-send-part-crypto-table-txouts2-'+i+'-amount-R' ).html(ych.gui.format_amount_or_empty(txout.amount));
    $( '#page-send-part-crypto-table-txouts2-'+i+'-free-R'   ).html(ych.gui.format_amount_or_empty(txout.free));
    $( '#page-send-part-crypto-table-txouts2-'+i+'-orders-R' ).html(ych.gui.format_amount_or_empty(txout.orders));
    $( '#page-send-part-crypto-table-txouts2-'+i+'-indebt-R' ).html(ych.gui.format_amount_or_empty(txout.filled));
  });
};

part.refresh_table_txouts3 = function() {
  ych.gui.table_clear('page-send-part-crypto-table-txouts3');
  // pre-resize
  let n=0;
  part.op3.txouts.forEach(function(txout, idx) { n++; });
  ych.gui.table_resize('page-send-part-crypto-table-txouts3', n+2);
  // fill data
  part.op3.txouts.forEach(function(txout, i) {
    $( '#page-send-part-crypto-table-txouts3-'+i+'-txout-C'  ).html(ych.gui.format_txout_link2(part.coin, txout.txid, txout.nout, txout.state));
    $( '#page-send-part-crypto-table-txouts3-'+i+'-amount-R' ).html(ych.gui.format_amount_or_empty(txout.amount));
    $( '#page-send-part-crypto-table-txouts3-'+i+'-free-R'   ).html(ych.gui.format_amount_or_empty(txout.free));
    $( '#page-send-part-crypto-table-txouts3-'+i+'-orders-R' ).html(ych.gui.format_amount_or_empty(txout.orders));
    $( '#page-send-part-crypto-table-txouts3-'+i+'-indebt-R' ).html(ych.gui.format_amount_or_empty(txout.filled));
  });
};

part.update_table_outputs = function() {
  let i =0;
  let n =1;
  let nt = "";
  $( '#page-send-to-crypto-outs-table-'+i+'-N'        ).text(n);
  $( '#page-send-to-crypto-outs-table-'+i+'-amount-R' ).html(ych.gui.format_amount_or_empty(part.op2.amount_out));
  $( '#page-send-to-crypto-outs-table-'+i+'-to'       ).text("Receiver");
  // with checks minamount
  let minamount = ych.data.coininfos[part.coin].fee.minamount;
  i =1;
  if (part.op2.change != 0n) { n++; nt = n; } else { nt = ""; }
  $( '#page-send-to-crypto-outs-table-'+i+'-N'        ).text(nt);
  $( '#page-send-to-crypto-outs-table-'+i+'-amount-R' ).html(ych.gui.format_amount_or_empty(part.op2.change));
  $( '#page-send-to-crypto-outs-table-'+i+'-to'       ).text("Change");
  i =2;
  if (part.op2.credit != 0n) { n++; nt = n; } else { nt = ""; }
  $( '#page-send-to-crypto-outs-table-'+i+'-N'        ).text(nt);
  $( '#page-send-to-crypto-outs-table-'+i+'-amount-R' ).html(ych.gui.format_amount_or_empty(part.op2.credit));
  $( '#page-send-to-crypto-outs-table-'+i+'-to'       ).text("Credit");
  i =3;
  if (part.datatag != 0n) { n++; nt = n; } else { nt = ""; }
  $( '#page-send-to-crypto-outs-table-'+i+'-N'        ).text(nt);
  $( '#page-send-to-crypto-outs-table-'+i+'-amount-R' ).html(ych.gui.format_amount_or_empty(part.datatag));
  $( '#page-send-to-crypto-outs-table-'+i+'-to'       ).text("Data tag");
  i =4;
  $( '#page-send-to-crypto-outs-table-'+i+'-N'        ).html("&nbsp;");
  $( '#page-send-to-crypto-outs-table-'+i+'-amount-R' ).text("");
  $( '#page-send-to-crypto-outs-table-'+i+'-to'       ).text("");
  i =5;
  let outs_val = part.op2.amount_out+part.op2.change+part.op2.credit+part.datatag;
  $( '#page-send-to-crypto-outs-table-'+i+'-N'        ).text("");
  $( '#page-send-to-crypto-outs-table-'+i+'-amount-R' ).html(ych.gui.format_amount_or_empty(outs_val));
  $( '#page-send-to-crypto-outs-table-'+i+'-to'       ).html("<b>All outputs</b>");
  i =6;
  $( '#page-send-to-crypto-outs-table-'+i+'-N'        ).text("");
  $( '#page-send-to-crypto-outs-table-'+i+'-amount-R' ).html(ych.gui.format_amount_or_empty(part.op2.netfee));
  $( '#page-send-to-crypto-outs-table-'+i+'-to'       ).text("Network fee");
  i =7;
  let outs_total = part.op2.amount_out+part.op2.change+part.op2.credit+part.datatag+part.op2.netfee;
  $( '#page-send-to-crypto-outs-table-'+i+'-N'        ).text("");
  $( '#page-send-to-crypto-outs-table-'+i+'-amount-R' ).html(ych.gui.format_amount_or_empty(outs_total));
  $( '#page-send-to-crypto-outs-table-'+i+'-to'       ).html("<b>Total</b>");
  i =8;
  $( '#page-send-to-crypto-outs-table-'+i+'-N'        ).html("&nbsp;");
  $( '#page-send-to-crypto-outs-table-'+i+'-amount-R' ).text("");
  $( '#page-send-to-crypto-outs-table-'+i+'-to'       ).text("");
  i =9;
  $( '#page-send-to-crypto-outs-table-'+i+'-N'        ).text("");
  $( '#page-send-to-crypto-outs-table-'+i+'-amount-R' ).html(ych.gui.format_amount_or_empty(part.op2.debit));
  $( '#page-send-to-crypto-outs-table-'+i+'-to'       ).text("Debit change");
  part.update_table_outputs_show_err();
};

part.update_table_outputs_show_err = function() {
  // with checks minamount
  let minamount = ych.data.coininfos[part.coin].fee.minamount;
  i =1;
  if (part.op2.change != 0n && part.op2.change < minamount) {
    ych.gui.table_row_add_class('page-send-to-crypto-outs-table', i, 'ytable-cell-warn-red');
  } else {
    ych.gui.table_row_remove_class('page-send-to-crypto-outs-table', i, 'ytable-cell-warn-red');
  }
  i =2;
  if (part.op2.credit != 0n && part.op2.credit < minamount) {
    ych.gui.table_row_add_class('page-send-to-crypto-outs-table', i, 'ytable-cell-warn-red');
  } else {
    ych.gui.table_row_remove_class('page-send-to-crypto-outs-table', i, 'ytable-cell-warn-red');
  }
};

part.update_table_selected1 = function() {
  if (part.op1.amount_inp == 0n) { // just cleanup
    part.op1.txouts.forEach(function(txout, idx) {
      let txoutid = txout.txid+":"+txout.nout;
      let i = part.op1.txout_id_to_idx[txoutid];
      ych.gui.table_row_remove_class('page-send-part-crypto-table-txouts1', i, 'ytable-cell-grey-out');
      $( '#page-send-part-crypto-table-txouts1-'+i+'-N' ).text("");
      $( '#page-send-part-crypto-table-txouts1-'+i+'-use-R' ).text("");
    });
    return;
  }
  // update of use1
  let txoutid_sel1 = {};
  part.op1.selected.forEach(function(txout, idx) {
    let txoutid = txout.txid+":"+txout.nout;
    let i = part.op1.txout_id_to_idx[txoutid];
    txoutid_sel1[txoutid] = true;
    $( '#page-send-part-crypto-table-txouts1-'+i+'-use-R' ).html(ych.gui.format_amount_or_empty(txout.selected));
  });
  let num =1;
  part.op1.txouts.forEach(function(txout, idx) {
    let txoutid = txout.txid+":"+txout.nout;
    let i = part.op1.txout_id_to_idx[txoutid];
    if (!(txoutid in txoutid_sel1)) {
      $( '#page-send-part-crypto-table-txouts1-'+i+'-N' ).text("");
      $( '#page-send-part-crypto-table-txouts1-'+i+'-use-R' ).text("");
    } else {
      $( '#page-send-part-crypto-table-txouts1-'+i+'-N' ).text(num);
      num++;
    }
    if (!(txoutid in txoutid_sel1)) {
      ych.gui.table_row_add_class('page-send-part-crypto-table-txouts1', i, 'ytable-cell-grey-out');
    } else {
      ych.gui.table_row_remove_class('page-send-part-crypto-table-txouts1', i, 'ytable-cell-grey-out');
    }
  });
};

part.update_table_selected2 = function() {
  if (part.op2.amount_inp == 0n) { // just cleanup
    part.op2.txouts.forEach(function(txout, idx) {
      let txoutid = txout.txid+":"+txout.nout;
      let i = part.op2.txout_id_to_idx[txoutid];
      ych.gui.table_row_remove_class('page-send-part-crypto-table-txouts2', i, 'ytable-cell-grey-out');
      $( '#page-send-part-crypto-table-txouts2-'+i+'-N' ).text("");
      $( '#page-send-part-crypto-table-txouts2-'+i+'-use-R' ).text("");
    });
    return;
  }
  // update of use
  let txoutid_sel2 = {};
  part.op2.selected.forEach(function(txout, idx) {
    let txoutid = txout.txid+":"+txout.nout;
    let i = part.op2.txout_id_to_idx[txoutid];
    txoutid_sel2[txoutid] = true;
    $( '#page-send-part-crypto-table-txouts2-'+i+'-use-R' ).html(ych.gui.format_amount_or_empty(txout.selected));
  });
  let num =1;
  part.op2.txouts.forEach(function(txout, idx) {
    let txoutid = txout.txid+":"+txout.nout;
    let i = part.op2.txout_id_to_idx[txoutid];
    if (!(txoutid in txoutid_sel2)) {
      $( '#page-send-part-crypto-table-txouts2-'+i+'-N' ).text("");
      $( '#page-send-part-crypto-table-txouts2-'+i+'-use-R' ).text("");
    } else {
      $( '#page-send-part-crypto-table-txouts2-'+i+'-N' ).text(num);
      num++;
    }
    if (!(txoutid in txoutid_sel2)) {
      ych.gui.table_row_add_class('page-send-part-crypto-table-txouts2', i, 'ytable-cell-grey-out');
    } else {
      ych.gui.table_row_remove_class('page-send-part-crypto-table-txouts2', i, 'ytable-cell-grey-out');
    }
  });
  //totals
  let i = part.op2.txouts.length;
  {
    ych.gui.table_row_add_class('page-send-part-crypto-table-txouts2', i, 'ytable-cell-grey-out');
    $( '#page-send-part-crypto-table-txouts2-'+i+'-txout-C'  ).html("&nbsp;");
    $( '#page-send-part-crypto-table-txouts2-'+i+'-amount-R' ).text("");
    $( '#page-send-part-crypto-table-txouts2-'+i+'-free-R'   ).text("Netfee:");
    $( '#page-send-part-crypto-table-txouts2-'+i+'-orders-R' ).text("Change:");
    $( '#page-send-part-crypto-table-txouts2-'+i+'-indebt-R' ).text("Credit:");
    $( '#page-send-part-crypto-table-txouts2-'+i+'-use-R'    ).text("Receiver:");
    i++;
    let inputs_val =0n;
    part.op2.selected.forEach(function(txout, idx) { inputs_val += txout.amount; });
    ych.gui.table_row_remove_class('page-send-part-crypto-table-txouts2', i, 'ytable-cell-grey-out');
    $( '#page-send-part-crypto-table-txouts2-'+i+'-txout-C'  ).html("<b>All inputs</b>");
    $( '#page-send-part-crypto-table-txouts2-'+i+'-amount-R' ).html(ych.gui.format_amount_or_empty(inputs_val));
    $( '#page-send-part-crypto-table-txouts2-'+i+'-free-R'   ).html(ych.gui.format_amount_or_empty(part.op2.netfee));
    $( '#page-send-part-crypto-table-txouts2-'+i+'-orders-R' ).html(ych.gui.format_amount_or_empty(part.op2.change));
    $( '#page-send-part-crypto-table-txouts2-'+i+'-indebt-R' ).html(ych.gui.format_amount_or_empty(part.op2.credit));
    $( '#page-send-part-crypto-table-txouts2-'+i+'-use-R'    ).html(ych.gui.format_amount_or_empty(part.op2.amount_out));
  }
};

part.update_table_selected3 = function() {
  if (part.op3.amount_inp == 0n) { // just cleanup
    part.op3.txouts.forEach(function(txout, idx) {
      let txoutid = txout.txid+":"+txout.nout;
      let i = part.op3.txout_id_to_idx[txoutid];
      ych.gui.table_row_remove_class('page-send-part-crypto-table-txouts3', i, 'ytable-cell-grey-out');
      $( '#page-send-part-crypto-table-txouts3-'+i+'-N' ).text("");
      $( '#page-send-part-crypto-table-txouts3-'+i+'-use-R' ).text("");
    });
    return;
  }
  // update of use
  let txoutid_sel3 = {};
  part.op3.selected.forEach(function(txout, idx) {
    let txoutid = txout.txid+":"+txout.nout;
    let i = part.op3.txout_id_to_idx[txoutid];
    txoutid_sel3[txoutid] = true;
    $( '#page-send-part-crypto-table-txouts3-'+i+'-use-R' ).html(ych.gui.format_amount_or_empty(txout.selected));
  });
  let num =1;
  part.op3.txouts.forEach(function(txout, idx) {
    let txoutid = txout.txid+":"+txout.nout;
    let i = part.op3.txout_id_to_idx[txoutid];
    if (!(txoutid in txoutid_sel3)) {
      $( '#page-send-part-crypto-table-txouts3-'+i+'-N' ).text("");
      $( '#page-send-part-crypto-table-txouts3-'+i+'-use-R' ).text("");
    } else {
      $( '#page-send-part-crypto-table-txouts3-'+i+'-N' ).text(num);
      num++;
    }
    if (!(txoutid in txoutid_sel3)) {
      ych.gui.table_row_add_class('page-send-part-crypto-table-txouts3', i, 'ytable-cell-grey-out');
    } else {
      ych.gui.table_row_remove_class('page-send-part-crypto-table-txouts3', i, 'ytable-cell-grey-out');
    }
  });
  //totals
  let i = part.op3.txouts.length;
  {
    ych.gui.table_row_add_class('page-send-part-crypto-table-txouts3', i, 'ytable-cell-grey-out');
    $( '#page-send-part-crypto-table-txouts3-'+i+'-txout-C'  ).html("&nbsp;");
    $( '#page-send-part-crypto-table-txouts3-'+i+'-amount-R' ).text("");
    $( '#page-send-part-crypto-table-txouts3-'+i+'-free-R'   ).text("Netfee:");
    $( '#page-send-part-crypto-table-txouts3-'+i+'-orders-R' ).text("Change:");
    $( '#page-send-part-crypto-table-txouts3-'+i+'-indebt-R' ).text("Credit:");
    $( '#page-send-part-crypto-table-txouts3-'+i+'-use-R'    ).text("Receiver:");
    i++;
    let inputs_val =0n;
    part.op3.selected.forEach(function(txout, idx) { inputs_val += txout.amount; });
    ych.gui.table_row_remove_class('page-send-part-crypto-table-txouts3', i, 'ytable-cell-grey-out');
    $( '#page-send-part-crypto-table-txouts3-'+i+'-txout-C'  ).html("<b>All inputs</b>");
    $( '#page-send-part-crypto-table-txouts3-'+i+'-amount-R' ).html(ych.gui.format_amount_or_empty(inputs_val));
    $( '#page-send-part-crypto-table-txouts3-'+i+'-free-R'   ).html(ych.gui.format_amount_or_empty(part.op3.netfee));
    $( '#page-send-part-crypto-table-txouts3-'+i+'-orders-R' ).html(ych.gui.format_amount_or_empty(part.op3.change));
    $( '#page-send-part-crypto-table-txouts3-'+i+'-indebt-R' ).html(ych.gui.format_amount_or_empty(part.op3.credit));
    $( '#page-send-part-crypto-table-txouts3-'+i+'-use-R'    ).html(ych.gui.format_amount_or_empty(part.op3.amount_out));
  }
};

part.update_fee_text = function() {
  const coininfo = ych.data.coininfos[part.coin];
  const usdrate = coininfo.ext.priceext;
  const minamount = coininfo.fee.minamount;
  const sendfee = part.sendfee;

  if (coininfo.type == "txout_t1") {
    let txbytefee = coininfo.fee.txbytefee;

    let inps_num = part.op2.num_inps;
    let outs_num = part.op2.num_outs;

    const fee_mul = coininfo.fee.withfee;

    $( '#page-send-to-crypto-head-sendfee'  ).text("Withdraw Fee "+(fee_mul*100.).toFixed(2)+"%:");
    $( '#page-send-to-crypto-text-sendfee'  ).html(
      "≈$"+
      (Number(sendfee) / 1.e8 *usdrate).toFixed(2)+
      " "+
      ych.gui.format_amount(sendfee));

    $( '#page-send-to-crypto-head-netfee'  ).text("Network "+(txbytefee * 1.0e8).toFixed(2)+" Sat/B:");
    $( '#page-send-to-crypto-text-netfee'  ).html(
      "≈$"+
      (Number(part.op2.netfee) / 1.e8 *usdrate).toFixed(2)+
      " ("+inps_num+"-"+outs_num+") "+
      ych.gui.format_amount(part.op2.netfee));

    $( '#page-send-to-crypto-text-total' ).html(
      "≈$"+
      (Number(part.op2.amount_out+sendfee+part.op2.netfee+part.datatag) / 1.e8 *usdrate).toFixed(2)+" "+
      ych.gui.format_amount(part.op2.amount_out+sendfee+part.op2.netfee+part.datatag));

    inps_num = part.op3.num_inps;
    outs_num = part.op3.num_outs;

    $( '#form-send-adj-div-quantity' ).html(
      "≈$"+
      (Number(part.op3.amount_out) / 1.e8 *usdrate).toFixed(2)+" "+
      ych.gui.format_amount(part.op3.amount_out));

    $( '#form-send-adj-div-sendfee' ).html(
      "≈$"+
      (Number(part.sendfee) / 1.e8 *usdrate).toFixed(2)+" "+
      ych.gui.format_amount(part.sendfee));

    $( '#form-send-adj-div-netfee' ).html(
      "≈$"+
      (Number(part.op3.netfee) / 1.e8 *usdrate).toFixed(2)+
      " ("+inps_num+"-"+outs_num+") "+
      ych.gui.format_amount(part.op3.netfee));

    $( '#form-send-adj-div-total' ).html(
      "≈$"+
      (Number(part.op3.amount_out+sendfee+part.op3.netfee+part.datatag) / 1.e8 *usdrate).toFixed(2)+" "+
      ych.gui.format_amount(part.op3.amount_out+sendfee+part.op3.netfee+part.datatag));

  }
  if (coininfo.type == "evm_t1" || coininfo.type == "erc20_t1") {
    const fee_mul = coininfo.fee.withfee;

    $( '#page-send-to-crypto-head-sendfee'  ).text("Withdraw Fee "+(fee_mul*100.).toFixed(2)+"%:");
    $( '#page-send-to-crypto-text-sendfee'  ).html(
      "≈$"+
      (Number(sendfee) / 1.e8 *usdrate).toFixed(2)+
      " "+
      ych.gui.format_amount(sendfee));
    $( '#page-send-to-crypto-head-netfee'  ).text("Network:");
    $( '#page-send-to-crypto-text-netfee'  ).html(
      "(estimated by Web3 Provider)");
    $( '#page-send-to-crypto-text-total' ).html(
      "≈$"+
      (Number(part.op2.amount_out+sendfee) / 1.e8 *usdrate).toFixed(2)+" "+
      ych.gui.format_amount(part.op2.amount_out+sendfee));
  }
  if (coininfo.type == "peg_t1") {
    const fee_mul = coininfo.fee.withfee;

    $( '#page-send-to-crypto-head-sendfee'  ).text("Withdraw Fee "+(fee_mul*100.).toFixed(2)+"%:");
    $( '#page-send-to-crypto-text-sendfee'  ).html(
      "≈$"+
      (Number(sendfee) / 1.e8 *usdrate).toFixed(2)+
      " "+
      ych.gui.format_amount(sendfee));
    $( '#page-send-to-crypto-head-netfee'  ).text("Network (fixed):");
    $( '#page-send-to-crypto-text-netfee'  ).html(
      "≈$"+
      (Number(part.op2.netfee) / 1.e8 *usdrate).toFixed(2)+
      " "+
      ych.gui.format_amount(part.op2.netfee));
    $( '#page-send-to-crypto-text-total' ).html(
      "≈$"+
      (Number(part.op2.amount_out+sendfee+part.op2.netfee) / 1.e8 *usdrate).toFixed(2)+" "+
      ych.gui.format_amount(part.op2.amount_out+sendfee+part.op2.netfee));
  }
};

//clear all errors
part.clear_error = function() {
  iziToast.destroy();

  //$( '#page-send-to-crypto-box-err' ).css("background-color", "rgba(0,0,0,0)");
  //$( '#page-send-to-crypto-box-err' ).text('\u00A0');
};

//show error
part.show_error = function(err) {
  iziToast.error({
      icon: 'ti ti-alert-circle',
      title: 'Error',
      message: `${err}`,
    });

  /*
  $( '#page-send-to-crypto-button-preview' ).prop("disabled",true);
  $( '#page-send-to-crypto-button-send' ).prop("disabled",true);
  $( '#page-send-to-crypto-box-err' ).css("background-color", "rgba(255,0,0,0.25)");
  $( '#page-send-to-crypto-box-err' ).text(err);
  */
};

part.show_ready = function() {
  $( '#page-send-to-crypto-button-preview' ).prop("disabled", false);
  $( '#page-send-to-crypto-button-send' ).prop("disabled", false);
  part.clear_error();
};

part.refresh_gui = function() {
  part.refresh_table_txouts1();
  part.refresh_table_txouts2();
  part.refresh_table_txouts3();
  part.update_table_selected1();
  part.update_table_selected2();
  part.update_table_selected3();
  part.update_table_outputs();
  part.update_fee_text();
};

part.show_error_and_refresh = function(err) {
  part.refresh_gui();
  part.show_error(err);
};

$( '#page-send-to-crypto-button-max' ).click( function( event ) {
  event.preventDefault();
  part.select_amount_percent(100);
});
$( '#page-send-to-crypto-text-free' ).click(function(event) {
  event.preventDefault();
  part.select_amount_percent(100);
});

//added by anoxy
//type: event handler
//descr: fill max amount for quantity 
$( '#withdraw .page-send-to-crypto-max-xy' ).click(function(event) {
  event.preventDefault();
  part.select_amount_percent(100);
});

for (let i=10;i<100;i+=10) {
  $( '#page-send-to-crypto-text-free-fill-'+i ).click(function(event) {
    event.preventDefault();
    part.select_amount_percent(i);
  });
}

});
