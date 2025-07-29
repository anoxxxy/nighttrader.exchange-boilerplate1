/*!
* ych SPA exchange
*
* Copyright Lynxline LLC, yshurik, 2019-2023,
* Common Clause license https://commonsclause.com/
*/

$( function() {

console.log("Init multisig-txout");

ych.str2bytes = function(str) {
    let utf8 = [];
    for (let i = 0; i < str.length; i++) {
        let charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
            utf8.push(0xc0 | (charcode >> 6),
                      0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
            utf8.push(0xe0 | (charcode >> 12),
                      0x80 | ((charcode>>6) & 0x3f),
                      0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
            i++;
            // UTF-16 encodes 0x10000-0x10FFFF by
            // subtracting 0x10000 and splitting the
            // 20 bits of 0x0-0xFFFFF into two halves
            charcode = 0x10000 + (((charcode & 0x3ff)<<10)
                      | (str.charCodeAt(i) & 0x3ff));
            utf8.push(0xf0 | (charcode >>18),
                      0x80 | ((charcode>>12) & 0x3f),
                      0x80 | ((charcode>>6) & 0x3f),
                      0x80 | (charcode & 0x3f));
        }
    }
    return utf8;
};

ych.privtopub = function(hash, compressed) {
  let privateKeyBigInt = BigInteger.fromByteArrayUnsigned(Crypto.util.hexToBytes(hash));
  let curve = EllipticCurve.getSECCurveByName("secp256k1");

  let curvePt = curve.getG().multiply(privateKeyBigInt);
  let x = curvePt.getX().toBigInteger();
  let y = curvePt.getY().toBigInteger();

  let publicKeyBytes = EllipticCurve.integerToBytes(x, 32);
  publicKeyBytes = publicKeyBytes.concat(EllipticCurve.integerToBytes(y,32));
  publicKeyBytes.unshift(0x04);

  if(compressed==true){
    let publicKeyBytesCompressed = EllipticCurve.integerToBytes(x,32)
    if (y.isEven()){
      publicKeyBytesCompressed.unshift(0x02)
    } else {
      publicKeyBytesCompressed.unshift(0x03)
    }
    return Crypto.util.bytesToHex(publicKeyBytesCompressed);
  } else {
    return Crypto.util.bytesToHex(publicKeyBytes);
  }
};

ych.user_keys_v1 = function(userid, password) {
  userid = ych.gui.cleanup_email(userid);
  let prvkey = Crypto.SHA256(Crypto.SHA256(userid)+Crypto.SHA256(password));
  let pubkey = ych.privtopub(prvkey, true);
  return [prvkey, pubkey];
};

ych.init_coinjs = function(coin) {
  // default testnet3
  coinjs.pub = [111];
  coinjs.priv = [239];
  coinjs.multisig = [196];
  coinjs.base32pref = "";
  coinjs.compressed = false;
  coinjs.txversion = 1;
  coinjs.shf = 0;
  coinjs.maxrbf = 0;
  coinjs.txExtraTimeField = 0;

  if(!ych.data.coininfos)
    return; //coininfos if undefined
  // from coininfo config
  if (!(coin in ych.data.coininfos)) {
    return; // no coininfo
  }
  if (ych.data.coininfos[coin].type != "peg_t1" &&
      ych.data.coininfos[coin].type != "txout_t1" ) {
    return; // no txout-type config
  }
  let cfg = ych.data.coininfos[coin].cfg;
  if (cfg.pub == "") {
    return; // no txout-type config pub
  }
  let pubbytes = Crypto.util.hexToBytes(cfg.pub);
  let prvbytes = Crypto.util.hexToBytes(cfg.prv);
  let msigbytes = Crypto.util.hexToBytes(cfg.msig);
  coinjs.pub = pubbytes;
  coinjs.priv = prvbytes;
  coinjs.multisig = msigbytes;
  coinjs.base32pref = cfg.pref;
  coinjs.compressed = cfg.comp;
  coinjs.txversion = cfg.txver;
  coinjs.txExtraTimeField = cfg.txtime;
  coinjs.shf = cfg.shf;
  coinjs.maxrbf = cfg.maxrbf;
};

/* input txouts to be sorted min-to-max */
ych.txout_select_inps = function(txouts, amount) {
  let txouts_selected = [];
  let txouts_selected_free = 0n;
  let txouts_selected_orders = 0n;
  let txouts_selected_filled = 0n;

  // check available
  let txouts_free = 0n;
  txouts.forEach(function(txout, i) { txouts_free += txout.free; });
  if (txouts_free < amount) {
    console.log("ych_select_txouts, free", txouts_free," is less than amount", amount);
    return [txouts_selected, -1, -1, -1];
  }
  // select one-by-one
  while (txouts_selected_free < amount) {
    // from minimum to maximum
    for(let idx=0; idx< txouts.length; idx++) {
      let txout = txouts[idx];
      if ((idx+1)==txouts.length) { // last one
        txouts_selected.push(txout);
        txout.selected = txout.free;
        txouts_selected_free += txout.free;
        txouts_selected_orders += txout.orders;
        txouts_selected_filled += txout.filled;
        txouts = txouts.slice(0, idx);
        break;
      } else {
        if ((txouts_selected_free+txout.free) >= amount) {
          txouts_selected.push(txout);
          txout.selected = txout.free;
          txouts_selected_free += txout.free;
          txouts_selected_orders += txout.orders;
          txouts_selected_filled += txout.filled;
          txouts.splice(idx, 1);
          break;
        }
      }
      if (txouts_selected_free >= amount) {
        break;
      }
    }
    // all txouts are used, break
    if (txouts_selected_free < amount && txouts.length ==0) {
      console.log("ych_select_txouts, no fit", txouts_selected_free, amount);
      return [txouts_selected, -1, -1, -1];
    }
  }
  // first one (maximal) to be part-selected
  if (txouts_selected_free > amount && txouts_selected.length >0) {
    txout = txouts_selected[0];
    txout.selected -= (txouts_selected_free - amount);
  }
  // ready
  return [txouts_selected, txouts_selected_free, txouts_selected_orders, txouts_selected_filled];
}

ych.sign_txout = async function(txout) /*[usetxout, err]*/ {
  console.log('===ych.sign_txout===');
  if (txout.txid == "") {
    return [null, "Txid is empty"];
  }
  if (txout.nout <0) {
    return [null, "Nout is not valid"];
  }
  const coin = txout.coin;
  const change_addr = ych.address[coin];
  if (change_addr == "") {
    return [null,"Not change address"];
  }
  if (!(coin in ych.data.coininfos)) {
    return [null,"No coininfo"];
  }
  const coininfo = ych.data.coininfos[coin];
  const coin_min = coininfo.fee.minamount;
  if (coininfo.type != "txout_t1") {
    return [null,"Not supported"];
  }
  if (txout.addr.rdsc == "") {
    return [null,"Redeem script is not valid"];
  }

  let change_sigv = txout.free-txout.selected;

  // check if ops amount is more than min amount
  let amount_ops = txout.amount - change_sigv;
  if (amount_ops < coin_min) { amount_ops = coin_min; }
  if (amount_ops > txout.amount) { amount_ops = txout.amount; }
  change_sigv = txout.amount - amount_ops;

  // check if rest amount is more than min amount
  let change_rest = txout.amount - txout.filled - change_sigv;
  if (change_rest < coin_min) { change_rest = coin_min; }
  if (change_rest > (txout.amount-txout.filled)) { change_rest = (txout.amount-txout.filled); }
  change_sigv = txout.amount - txout.filled - change_rest;

  let signed_txinp = {};
  signed_txinp.txid = txout.txid;
  signed_txinp.nout = txout.nout;
  signed_txinp.amnt = txout.amount;
  signed_txinp.fill = txout.filled;
  signed_txinp.usea = txout.selected;

  if (change_sigv >= coin_min) {

    const sigs = await ych.sign_txout_multipos(
      coin,
      txout,
      change_addr,
      change_sigv
    );
    if (sigs.length == 0) {
      return [null,"Fail to sign change"];
    }

    signed_txinp.sigv = change_sigv;
    signed_txinp.siga = change_addr;
    signed_txinp.sigs = sigs;
    signed_txinp.sigf = "";

    return [signed_txinp,null];
  }

  // change is lesser than minimal, sign full

  const sigf = await ych.sign_txout_full(coin, txout);
  if (sigf.length == 0) {
    return [null,"Fail to sign txout"];
  }

  signed_txinp.sigv = 0n;
  signed_txinp.siga = "";
  signed_txinp.sigs = [];
  signed_txinp.sigf = sigf;

  return [signed_txinp,null];
}

ych.sign_txout_full = async function(coin, txout) {
console.log('===sign_txout_full===');
  if (txout.txid == "") {
    console.log("Txid is empty");
    return [];
  }
  if (txout.nout <0) {
    console.log("Nout is not valid");
    return [];
  }
  if (!(coin in ych.data.coininfos)) {
    console.log("No coininfo", coin);
    return [];
  }
  const coininfo = ych.data.coininfos[coin];

  if (coininfo.type == "txout_t1") {

    if (txout.addr.rdsc == "") {
      console.log("Redeem script is not valid");
      return [];
    }

    ych.init_coinjs(coin);

    let rbf = null;
    if (coinjs.maxrbf >0) {
      rbf = coinjs.maxrbf-1;
    }
    let hashType = 130 // 0x82
    let tx = coinjs.transaction();

    // inputs
    tx.addinput(txout.txid, txout.nout, Crypto.util.hexToBytes(txout.addr.rdsc), rbf, txout.amount);

    // sigs
    let wif = coinjs.privkey2wif(ych.prvkey1);
    let sig = tx.transactionSig(0, wif, hashType);
    return sig;

  }

  console.log("Not supported", coin);
  return [];
}

ych.sign_txout_multipos = async function(coin, txout, change_addr, change_amount) {
  console.log('===sign_txout_multipos===');
  if (txout.txid == "") {
    console.log("Txid is empty");
    return [];
  }
  if (txout.nout <0) {
    console.log("Nout is not valid");
    return [];
  }
  if (change_addr == "") {
    console.log("Change address is empty");
    return [];
  }
  if (typeof change_amount != "bigint") {
    console.log("Change need bigint", change);
    return [];
  }
  if (!(coin in ych.data.coininfos)) {
    console.log("No coininfo", coin);
    return [];
  }
  const coininfo = ych.data.coininfos[coin];

  if (coininfo.type == "txout_t1") {

    if (txout.addr.rdsc == "") {
      console.log("Redeem script is not valid");
      return [];
    }

    ych.init_coinjs(coin);
    let rbf = null;
    if (coinjs.maxrbf >0) {
      rbf = coinjs.maxrbf-1;
    }
    let wif = coinjs.privkey2wif(ych.prvkey1);

    // sign change
    let sigs = [], sigs2 = [];
    let null_txid = 'e'.repeat(64);
    for(let i=0; i< ych.sigi_num; i++) {

      let tx = coinjs.transaction();

      for (let j=0; j<i; j++) {
        let nout = 0;
        let rdsc = [];
        tx.addinput(null_txid, nout, Crypto.util.hexToBytes(rdsc), null, 1n);
        tx.addoutput(change_addr, 1n);
      }

      tx.addinput(txout.txid, txout.nout, Crypto.util.hexToBytes(txout.addr.rdsc), rbf, txout.amount);
      tx.addoutput(change_addr, change_amount);

      //console.log("none-worker- started tx.serialize()(rawtx1):", tx.serialize());

      // sighash
      //let shType = hashType || 1;
      //let sighash = Crypto.util.hexToBytes(tx.transactionHash(i, shType));
      //console.log(sighash);

      // sigs
      let hashType = 131 // 0x83
      
      const txForWorker = {
        'tx': tx,
        'tx_serialized': tx.serialize(),
        'i': i,
        'wif': wif,
        'hashType': hashType
      };
      //console.log('none-worker- started: ', txForWorker);


      let sig = tx.transactionSig(i, wif, hashType);
      //console.log('none-worker-started sig: ', sig);
      //let sig2 = await signTransactionSigWithWorker(txForWorker.tx_serialized, txForWorker.i, txForWorker.wif, txForWorker.hashType); // Call the Web Worker function
      //console.log('worker-started sig2: ', sig2);
      let sighash = tx.transactionHash(i, hashType);

      //console.log("sighash:", Crypto.util.bytesToHex(sighash));
      //console.log("rawtx2:", tx.serialize());

      sigs.push(sig);
      //sigs2.push(sig2);
      await new Promise(resolve => setTimeout(resolve, 0)); // Introduce a small delay before the next iteration
    }

    //console.log('sigs', sigs);
    //console.log('sigs2', sigs2);
    return sigs;

  }

  console.log("Not supported", coin);
  return [];
};

  async function signTransactionSigWithWorker(tx, i, wif, hashType) {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./assets/js/worker/worker-sign.js');

      
      worker.onmessage = function(event) {
        //console.log('resolved!');
        const sig = event.data;
        worker.terminate();
        resolve(sig);
      };
      

      worker.onerror = function(error) {
        worker.terminate();
        reject(error);
      };


      worker.postMessage({
        'tx': tx,
        'i': i,
        'wif': wif,
        'hashType': hashType
      });
    });
  }

});
/*
var worker2 = new Worker('./assets/js/worker/worker-sign.js');

worker2.onmessage = function(event) {
    const sig = event.data;
    console.log('worker2 event', event);
    console.log('worker2 sig', sig);
    worker2.terminate();
    
  };

  worker2.onerror = function(error) {
    console.log('worker2 error', error);
    worker2.terminate();
    
  };

worker-sign.js started:  010000000000000001188219f812e73bb14ef4eef871fc663d44881740b2c3d0ad1863e96725e4f67400000000a163522103d5dc06be6cd1059777a5f7706b1da7924c195cca50cce6d913b7ca0a0e121f95210304f636703a7179e3a94064b89ffbcf27f9dd1f8cad7a2ef3e89895ba230ac8df52ae676304802d6565b1752103d5dc06be6cd1059777a5f7706b1da7924c195cca50cce6d913b7ca0a0e121f95ac670400614667b175210304f636703a7179e3a94064b89ffbcf27f9dd1f8cad7a2ef3e89895ba230ac8dfac6868ffffffff012cf6ea46c901000017a914efb8ceb03691b8bc15f3fa8379f48a26724f66f48700000000 0 92SHR6zADcAuEBDsdF8ghUKLnsevoKGpKfu4WU3YMyebtcNMtBK 131

var wM = [  '010000000000000001188219f812e73bb14ef4eef871fc663d44881740b2c3d0ad1863e96725e4f67400000000a163522103d5dc06be6cd1059777a5f7706b1da7924c195cca50cce6d913b7ca0a0e121f95210304f636703a7179e3a94064b89ffbcf27f9dd1f8cad7a2ef3e89895ba230ac8df52ae676304802d6565b1752103d5dc06be6cd1059777a5f7706b1da7924c195cca50cce6d913b7ca0a0e121f95ac670400614667b175210304f636703a7179e3a94064b89ffbcf27f9dd1f8cad7a2ef3e89895ba230ac8dfac6868ffffffff012c4f1717c901000017a914efb8ceb03691b8bc15f3fa8379f48a26724f66f48700000000', 0, '92SHR6zADcAuEBDsdF8ghUKLnsevoKGpKfu4WU3YMyebtcNMtBK', 131];

var ice = worker2.postMessage(wM);

      /*worker.postMessage([
        tx.serialize(),
        i,
        wif,
        hashType
      ]);
*/

