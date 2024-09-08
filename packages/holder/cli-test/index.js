const { bcs } = require('@mysten/sui/bcs');
const { fromB64, toB64 } = require('@mysten/sui/utils');
const { Resolver } = require('did-resolver');
const { WalrusDID } = require('@zktx.io/walrus-did');
const {
  WalrusDIDController,
  WalrusDIDResolver,
} = require('@zktx.io/walrus-did-resolver');

const CONFIG = require('./.config.json');

async function run() {
  const walrusDID = new WalrusDID({
    privateKey: toB64(fromB64(CONFIG.holder.privateKey).slice(1)),
  });

  // create and sign subject doc
  const subject = bcs.string().serialize('test subject 1').toBytes();
  const signature = await walrusDID.sign(subject);

  // create did doc
  const controller = new WalrusDIDController(
    'devnet',
    toB64(fromB64(CONFIG.issuer.privateKey).slice(1)),
  );
  const didDoc = await controller.create({
    subject: toB64(subject),
    publicKey: walrusDID.getPublicKey(),
    signature,
  });
  console.log(0, didDoc.didDocument.id);
  // console.log(1, JSON.stringify(didDoc, null, 4));
  const jwt = await walrusDID.signJWT(didDoc.didDocument.id, didDoc);
  // console.log(2, jwt)

  // verify JWT
  const walrusDIDResolver = new WalrusDIDResolver();
  const resolver = new Resolver(walrusDIDResolver.build());
  const verify = await walrusDID.verifyJWT(
    jwt,
    resolver,
    didDoc.didDocument.id,
  );
  console.log(88, verify.verified);

  // verify walrus
  console.log(
    99,
    await WalrusDID.VerifyMetaData(verify, controller.getPublicKey()),
  );
}

run();
