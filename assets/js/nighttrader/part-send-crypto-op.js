/*!
* ych SPA exchange
*
* Copyright Lynxline LLC, yshurik, 2019-2023,
* Common Clause license https://commonsclause.com/
*/

$( function() {

console.log("Init part send-crypto-op");

part = ych.gui.parts["send"]["crypto"];

part.makeop = function() {
  let op = {};
  op.reduce_mode = false;
  op.amount_inp = 0n;
  op.amount_out = 0n;
  op.txouts = [];
  op.txouts_user = [];
  op.txouts_debit = [];
  op.txout_id_to_idx = {};
  op.selected = [];
  op.unselected = [];
  op.netfee = 0n;
  op.debit = 0n;
  op.change = 0n;
  op.credit = 0n;
  op.num_inps = 0;
  op.num_outs = 0;
  op.tx = {};
  op.rawtx = "";
  op.select1 = function(amount, op2) /*err*/ {
    op.selected = [];
    // cleanup
    op.txouts.forEach(function(txout) { txout.selected=0n; });
    // first deduct as much from debit
    if (op.txouts_debit.length==1) {
      let txout = op.txouts_debit[0];
      if (txout.free > 0n) {
        let deduct = txout.free;
        if (deduct > amount) { deduct = amount; }
        txout.selected = deduct;
        op.selected.push(txout);
        amount -= deduct;
      }
    }
    if (amount > 0n) {
      let txouts = [...op.txouts_user];
      // input txouts to be sorted min-to-max
      txouts.sort(function(a, b) { return Number(a.free - b.free); });
      // check available
      {
        let txouts_free = 0n;
        txouts.forEach(function(txout, i) { txouts_free += txout.free; });
        if (txouts_free < amount) {
          console.log("txouts_free < amount", txouts_free, amount);
          return "Not enough available for withdraw";
        }
      }
      let selected = 0n;
      // select one-by-one
      while (selected < amount) {
        // from minimum to maximum
        for(let idx=0; idx< txouts.length; idx++) {
          let txout = txouts[idx];
          if ((idx+1)==txouts.length) { // last one
            op.selected.push(txout);
            let to_select = txout.free;
            if (selected + to_select > amount) {
              to_select = amount - selected;
            }
            txout.selected = to_select;
            selected += txout.free;
            txouts = txouts.slice(0, idx);
            break;
          } else {
            if ((selected+txout.free) >= amount) {
              op.selected.push(txout);
              let to_select = txout.free;
              if (selected + to_select > amount) {
                to_select = amount - selected;
              }
              txout.selected = to_select;
              selected += txout.free;
              txouts.splice(idx, 1);
              break;
            }
          }
          if (selected >= amount) {
            break;
          }
        }
      }
    }
    op.make_unselected();
    op.use2credit(op2);
    return null;
  };
  op.make_id2idx = function() {
    op.txout_id_to_idx = {};
    op.txouts.forEach(function(txout, idx) {
      const txoutid = txout.txid+":"+txout.nout;
      op.txout_id_to_idx[txoutid] = idx;
    });
  }
  op.make_unselected = function() {
    let sel_map = {};
    op.selected.forEach(function(txout) {
      let txoutid = txout.txid+":"+txout.nout;
      sel_map[txoutid] = true;
      op.credit += txout.filled;
      const change = txout.amount -txout.selected -txout.filled;
      op.change += change;
    });
    op.unselected = [];
    op.txouts.forEach(function(txout) {
      let txoutid = txout.txid+":"+txout.nout;
      if (txoutid in sel_map) { return; }
      op.unselected.push(txout);
    });
  }
  op.use2credit = function(op2) /*err*/ {
    // update txouts2 to increase credits
    op.selected.forEach(function(txout1, i) {
      const txoutid = txout1.txid+":"+txout1.nout;
      if (!(txoutid in op2.txout_id_to_idx)) return;
      const idx = op2.txout_id_to_idx[txoutid];
      let txout2 = op2.txouts[idx];
      if (txout2.txid == ych.zerotxid) {
        txout2.free = txout1.free-txout1.selected;
        txout2.amount = txout1.amount-txout1.selected;
      } else {
        txout2.free = txout1.free-txout1.selected;
        txout2.filled = txout1.filled+txout1.selected;
      }
    });
    return null;
  }
  op.select2 = function(amount_inp) /*err*/ {
    op.selected = [];
    // cleanup
    op.amount_inp = amount_inp;
    op.amount_out = amount_inp;
    op.debit = 0n;
    op.credit = 0n;
    op.change = 0n;
    op.netfee = 0n;
    op.txouts.forEach(function(txout) { txout.selected=0n; });
    let txouts = [...op.txouts_user];
    txouts.sort(function(a, b) { return Number(a.free - b.free); });
    // calc user/debit
    let amount_debit = 0n;
    let amount_user = amount_inp;
    let txouts_free = 0n;
    txouts.forEach(function(txout) { txouts_free += txout.free; });
    if (amount_user > txouts_free) {
      amount_debit = amount_user-txouts_free;
      amount_user = txouts_free;
    }
    // first deduct as less from debit
    let debit_txouts_used = false;
    if (amount_debit > 0n) {
      let amount_debit_todo = amount_debit;
      if (op.txouts_debit.length==1) {
        let txout = op.txouts_debit[0];
        if (txout.free > 0n) {
          let deduct = txout.free;
          if (deduct > amount_debit_todo) { deduct = amount_debit_todo; }
          txout.selected = deduct;
          op.selected.push(txout);
          amount_debit_todo -= deduct;
          debit_txouts_used = true;
        }
      }
      if (amount_debit_todo > 0n) {
        return "Not enough available for withdraw";
      }
    }
    let amount = amount_user;
    let selected = 0n;
    // select one-by-one
    while (selected < amount) {
      // from minimum to maximum
      for(let idx=0; idx< txouts.length; idx++) {
        let txout = txouts[idx];
        if ((idx+1)==txouts.length) { // last one
          op.selected.push(txout);
          let to_select = txout.free;
          if (selected + to_select > amount) {
            to_select = amount - selected;
          }
          txout.selected = to_select;
          selected += txout.free;
          txouts = txouts.slice(0, idx);
          break;
        } else {
          if ((selected+txout.free) >= amount) {
            op.selected.push(txout);
            let to_select = txout.free;
            if (selected + to_select > amount) {
              to_select = amount - selected;
            }
            txout.selected = to_select;
            selected += txout.free;
            txouts.splice(idx, 1);
            break;
          }
        }
        if (selected >= amount) {
          break;
        }
      }
      if (txouts.length==0) {
        break;
      }
    }
    if (selected < amount) {
      return "Not enough available for withdraw";
    }
    op.make_unselected();
    return null;
  }
  op.select3 = function(amount_inp) /*err*/ {
    op.selected = [];
    // cleanup
    op.amount_inp = amount_inp;
    op.amount_out = amount_inp;
    op.debit = 0n;
    op.credit = 0n;
    op.change = 0n;
    op.netfee = 0n;
    op.txouts.forEach(function(txout) { txout.selected=0n; });
    let txouts = [...op.txouts_user];
    txouts.sort(function(a, b) { return Number(a.free - b.free); });
    // calc user/debit
    let amount_debit = 0n;
    let amount_user = amount_inp;
    let txouts_free = 0n;
    txouts.forEach(function(txout) { txouts_free += txout.free; });
    if (amount_user > txouts_free) {
      amount_debit = amount_user-txouts_free;
      amount_user = txouts_free;
    }
    let amount = amount_user;
    let selected = 0n;
    // select one-by-one
    while (selected < amount) {
      // from minimum to maximum
      for(let idx=0; idx< txouts.length; idx++) {
        let txout = txouts[idx];
        if ((idx+1)==txouts.length) { // last one
          op.selected.push(txout);
          let to_select = txout.free;
          if (selected + to_select > amount) {
            to_select = amount - selected;
          }
          txout.selected = to_select;
          selected += txout.free;
          txouts = txouts.slice(0, idx);
          break;
        } else {
          if ((selected+txout.free) >= amount) {
            op.selected.push(txout);
            let to_select = txout.free;
            if (selected + to_select > amount) {
              to_select = amount - selected;
            }
            txout.selected = to_select;
            selected += txout.free;
            txouts.splice(idx, 1);
            break;
          }
        }
        if (selected >= amount) {
          break;
        }
      }
      if (txouts.length==0) {
        break;
      }
    }
    if (selected < amount) {
      return "Not enough available for withdraw";
    }
    // debit txouts
    txouts = [...op.txouts_debit];
    txouts.sort(function(a, b) { return Number(a.free - b.free); });
    amount = amount_debit;
    selected = 0n;
    // select one-by-one
    while (selected < amount) {
      // from minimum to maximum
      for(let idx=0; idx< txouts.length; idx++) {
        let txout = txouts[idx];
        if ((idx+1)==txouts.length) { // last one
          op.selected.push(txout);
          let to_select = txout.free;
          if (selected + to_select > amount) {
            to_select = amount - selected;
          }
          txout.selected = to_select;
          selected += txout.free;
          txouts = txouts.slice(0, idx);
          break;
        } else {
          if ((selected+txout.free) >= amount) {
            op.selected.push(txout);
            let to_select = txout.free;
            if (selected + to_select > amount) {
              to_select = amount - selected;
            }
            txout.selected = to_select;
            selected += txout.free;
            txouts.splice(idx, 1);
            break;
          }
        }
        if (selected >= amount) {
          break;
        }
      }
      if (txouts.length==0) {
        break;
      }
    }
    if (selected < amount) {
      return "Not enough available for withdraw";
    }
    op.make_unselected();
    return null;
  }
  op.add_more = function(amount) /*err*/ {
    let txouts = [];
    let txout_debit = null;
    op.unselected.forEach(function(txout) {
      if (txout.txid != ych.zerotxid) {
        txouts.push(txout);
      } else {
        txout_debit = txout;
      }
    });
    let extra_added = [];
    let selected = 0n;
    // resort use(amount-filled) to compare
    // input txouts to be sorted min-to-max
    txouts.sort(function(a, b) { return Number((a.amount-a.filled) - (b.amount-b.filled)); });
    // select one-by-one
    while (selected < amount) {
      // from minimum to maximum
      for(let idx=0; idx< txouts.length; idx++) {
        let txout = txouts[idx];
        let extra = txout.amount-txout.filled;
        if ((idx+1)==txouts.length) { // last one
          op.selected.push(txout);
          extra_added.push(txout);
          txout.selected = 0n;
          selected += extra;
          txouts = txouts.slice(0, idx);
          break;
        } else {
          if ((selected+extra) >= amount) {
            op.selected.push(txout);
            extra_added.push(txout);
            txout.selected = 0n;
            selected += extra;
            txouts.splice(idx, 1);
            break;
          }
        }
        if (selected >= amount) {
          break;
        }
      }
      if (txouts.length==0) {
        break;
      }
    }
    if (selected < amount && txout_debit != null) { // use debit
      let txout = txout_debit;
      let extra = txout.amount-txout.filled;
      op.selected.push(txout_debit);
      extra_added.push(txout_debit);
      txout_debit.selected = 0n;
      selected += extra;
    }
    if (selected < amount) {
      return "Not enough available to select";
    }
    // rebuild unselected
    let txoutid_sel = {};
    op.selected.forEach(function(txout) {
      let txoutid = txout.txid+":"+txout.nout;
      txoutid_sel[txoutid] = true;
    });
    extra_added.forEach(function(txout) {
      op.credit += txout.filled;
      const change = txout.amount -txout.selected -txout.filled;
      op.change += change;
    });
    op.unselected = [];
    op.txouts.forEach(function(txout) {
      let txoutid = txout.txid+":"+txout.nout;
      if (!(txoutid in txoutid_sel)) {
        op.unselected.push(txout);
      }
    });
    return null;
  };
  op.reduce = function(amount) /*?*/ {
    op.amount_out -= amount;
    let txouts = op.selected;
    txouts.sort(function(a,b) { return Number(a.selected-b.selected); });
    for(let idx=0; idx< txouts.length; idx++) {
      let txout = txouts[idx];
      let todo = amount;
      if (todo > txout.selected) { todo = txout.selected; }
      txout.selected -= todo;
      amount -= todo;
      if (amount==0n) { break; }
    }
  };
  op.stabilize_changes = function(min) /*bool*/ {
    if (min == 0n) {
      return true;
    }
    if ((op.credit ==0n || op.credit >=min) &&
        (op.change ==0n || op.change >=min)) {
      return true; // stabilized
    }
    const changes = op.change+op.credit;
    if (op.credit >0n && min <= changes && changes < (min+min)) {
      op.debit = op.change;
      op.credit = changes;
      op.change = 0n;
      return true; // stabilized
    }
    if (op.credit >0n && op.credit < min && changes >= (min+min)) {
      let diff = min - op.credit;
      op.debit += diff;
      op.credit += diff;
      op.change -= diff;
      return true; // stabilized
    }
    if (op.change >0n && op.change < min && changes >= (min+min)) {
      op.debit += op.change;
      op.credit += op.change;
      op.change = 0n;
      return true; // stabilized
    }
    return false;
  };
  op.stabilize_change = function(min, reduce) /*err*/ {
    const ok = op.stabilize_changes(min);
    if (ok) return null; // stabilized
    const changes = op.change+op.credit;
    let extra_add = min-changes;
    let extra_have = 0n;
    op.unselected.forEach(function(txout) { extra_have += txout.amount-txout.filled; });
    if (extra_add <= extra_have) {
      let err = op.add_more(extra_add);
      if (err!=null) { return err; }
      const ok = op.stabilize_changes(min);
      if (ok) return null;
    }
    else {
      if (reduce) {
        if (op.amount_out > extra_add) {
          op.reduce(extra_add);
          op.change += extra_add;
          const ok = op.stabilize_changes(min);
          if (ok) return null;
        }
      }
    }
    return "Can not configure inputs(1), change the quantity";
  };
  op.compute_netfee = function(coininfo) {
    if (op.amount_inp == 0n) {
      op.netfee = 0n;
      return;
    }
    if (coininfo.type == "peg_t1") {
      op.netfee = 10000000n;
      return;
    }
    if (coininfo.type == "txout_t1") {
      const txbytefee = coininfo.fee.txbytefee;
      op.num_inps = op.selected.length;
      op.num_outs = 1;
      if (op.change >0n) op.num_outs++;
      if (op.credit >0n) op.num_outs++;
      op.num_outs++; // tag
      let nbytes = op.num_inps*386 + (op.num_outs-1)*34 + 80 /*tag*/;
      if (coininfo.fee.txbyteround >1) {
        nbytes = Math.ceil( nbytes / coininfo.fee.txbyteround ) * coininfo.fee.txbyteround;
      }
      op.netfee = BigInt(Math.floor(nbytes * txbytefee * 1.0e8 + 0.5));
      const mempool_minx = coininfo.fee.mempoolminfee;
      const mempool_min = BigInt(Math.floor(mempool_minx * 1.0e8 + 0.5));
      if (op.netfee < mempool_min) {
        op.netfee = mempool_min;
      }
      return;
    }
    op.netfee = 0n;
    return;
  };
  op.stabilize_netfee = function(coininfo, reduce) /*err*/ {
    let min = 0n;
    if (coininfo.type == "txout_t1") { min = coininfo.fee.minamount; }
    const attempts = 10;
    let change_diff = 0n;
    let credit_diff = 0n;
    let debit_diff = 0n;
    for (let i =0; i< attempts; i++) {
      { // recover from previous attempt
        op.change += change_diff;
        op.credit += credit_diff;
        op.debit += debit_diff;
        change_diff = 0n;
        credit_diff = 0n;
        debit_diff = 0n;
      }
      // if inputs changed may need to stabilize change
      let err = op.stabilize_change(min, reduce); // may add extra if need, show err
      if (err != null) {
        break; // show err
      }
      //console.log("stabilize_netfee, attempt", i);
      // compute netfee for this attempt
      op.compute_netfee(coininfo);
      let netfee = op.netfee;
      let todo = netfee;
      // consume netfee via debitcredit
      if (op.debit >0n && op.credit >0n) {
        let can_consume = op.credit;
        if (can_consume > op.debit) { can_consume = op.debit; }
        if (can_consume > todo) { can_consume = todo; }
        if ((op.credit-can_consume) >0n && (op.credit-can_consume) <min) {
          can_consume = op.credit-min;
        }
        todo -= can_consume;
        credit_diff += can_consume;
        op.credit -= can_consume;
        debit_diff += can_consume;
        op.debit -= can_consume;
        if (todo == 0n) {
          //console.log("netfee stab via credit+debit");
          return null;  // stabilized
        }
      }
      // consume netfee via change
      if (op.change >0n && op.change >= todo) {
        change_diff += todo;
        op.change -= todo;
        todo = 0n;
        let err = op.stabilize_change(min, reduce); // may add extra if need, show err
        if (err != null) {
          break; // show err
        }
        // if inputs added? TODO check only about inputs
        op.compute_netfee(coininfo);
        if (netfee != op.netfee) {
          // some inputs/outputs are added
          // next attempts to stabilize totals
          continue;
        }
        return null; // stabilized
      }
      if (op.change >0n && op.change < todo) {
        change_diff += op.change;
        todo -= op.change;
        op.change = 0n;
      }
      let extra_add = todo;
      let extra_have = 0n;
      op.unselected.forEach(function(txout, i) { extra_have += txout.amount-txout.filled; });
      if (todo <= extra_have) {
        op.add_more(todo);
        change_diff += todo;
        op.change -= todo;
        todo = 0n;
        let ok = op.stabilize_changes(min);
        if (!ok) {
          break; // show err
        }
        // recompute if changed
        op.compute_netfee(coininfo);
        if (netfee != op.netfee) {
          // some inputs added or outputs changed
          // do more attempts to stabilize totals
          continue;
        }
        return null; // stabilized
      }
      else {
        if (reduce) {
          if (op.amount_out > todo) {
            op.reduce(todo);
            todo = 0n;
            let ok = op.stabilize_changes(min);
            if (!ok) {
              break; // show err
            }
            // recompute if changed
            op.compute_netfee(coininfo);
            if (netfee != op.netfee) {
              // some inputs added or outputs changed
              // do more attempts to stabilize totals
              continue;
            }
            return null; // stabilized
          }
        }
      }
    }
    return "Can not configure inputs(3), change the quantity";
  };
  op.stabilize = function(coininfo, min) /*err*/ {
    //console.log("op st0", JSON.parse(
    //  JSON.stringify(op, (key, value) =>
    //    typeof value === "bigint" ? value.toString() + "n" : value
    //  ),
    //  jsonBNparse
    //));
    let err = op.stabilize_change(min, op.reduce_mode);
    if (err != null) { return err; }
    //console.log("op st1", JSON.parse(
    //  JSON.stringify(op, (key, value) =>
    //    typeof value === "bigint" ? value.toString() + "n" : value
    //  ),
    //  jsonBNparse
    //));
    err = op.stabilize_netfee(coininfo, op.reduce_mode);
    if (err != null) { return err; }
    //console.log("op st2", JSON.parse(
    //  JSON.stringify(op, (key, value) =>
    //    typeof value === "bigint" ? value.toString() + "n" : value
    //  ),
    //  jsonBNparse
    //));
    return null;
  }

  return op;
}

});
