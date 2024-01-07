const jwt = require('jsonwebtoken')
const jwksRsa = require('jwks-rsa');
const cookie = require('cookie');
const path = require('path');
const fs = require('fs');
const { jwksUri } = require('./config');

function extractToken( req ) {
  if ( req.query && req.query.token) {
    return req.query.token;
  } else if ( req.headers.cookie ) {
    return cookie.parse(req.headers.cookie)['token'] ;
  } 
  else if (req.url.includes("token=")) {
    return req.url.split("token=")[1]
  }
  return null;
}

async function getSigningKey(token) {
  const jwksClient = jwksRsa({
    jwksUri, //
    caches: true,
    rateLimit: true
  })
  const { kid } = jwt.decode(token, { complete: true }).header
  const key = await jwksClient.getSigningKey(kid);
  return key.getPublicKey();
};

async function authMiddlewareWs( req ) {
  try {
    const token = extractToken( req );
    const signingKey = await getSigningKey( token );
    req.user = jwt.verify(token, signingKey, { algorithms: ['RS256'] })
    if(fs.existsSync(path.join('/tmp', 'user.json'))){
      const firstUser =  JSON.parse(fs.readFileSync(path.join('/tmp', 'user.json'), 'utf8'))
      if(firstUser.userId !== req.user.userId){
        throw new Error();
      }
    }
    req.authorized = true;
    req.token = token;
    fs.writeFileSync(path.join('/tmp', 'user.json'), JSON.stringify({ ...req.user, token}), 'utf8');
    console.log(`User: ${req.user.userId} -> Authorized`);
    return true;
  } catch ( e ) {
    // console.log(e)
    console.log(`Unauthorized`);
    throw e;
  }
}


module.exports = { authMiddlewareWs }
