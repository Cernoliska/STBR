import express from "express";
import session from "express-session";
import OAuth from "oauth-1.0a";
import crypto from "crypto";
import fetch from "node-fetch";
import { detectRoleFromWiki } from "./utils/roles.js";

const router = express.Router();

const {
  MW_OAUTH_KEY,
  MW_OAUTH_SECRET,
  MW_OAUTH_URL = "https://meta.wikimedia.org/w/index.php",
  MW_API_URL = "https://id.wikipedia.org/w/api.php",
  APP_BASE_URL = "http://localhost:8080",
  SESSION_SECRET = "change_this"
} = process.env;

router.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

const oauth = OAuth({
  consumer: { key: MW_OAUTH_KEY, secret: MW_OAUTH_SECRET },
  signature_method: "HMAC-SHA1",
  hash_function(base_string, key) {
    return crypto.createHmac("sha1", key).update(base_string).digest("base64");
  }
});

router.get("/login", async (req, res) => {
  try {
    const requestTokenUrl = `${MW_OAUTH_URL}?title=Special:OAuth/initiate`;
    const authHeader = oauth.toHeader(oauth.authorize({ url: requestTokenUrl, method: 'POST' }));
    const resp = await fetch(requestTokenUrl, { method: "POST", headers: { Authorization: authHeader.Authorization } });
    const text = await resp.text();
    const params = new URLSearchParams(text);
    const token = params.get("oauth_token");
    const secret = params.get("oauth_token_secret");
    req.session.oauth_token = token;
    req.session.oauth_token_secret = secret;
    res.redirect(`${MW_OAUTH_URL}?title=Special:OAuth/authorize&oauth_token=${token}`);
  } catch (e) {
    console.error(e);
    res.status(500).send("OAuth initiation failed");
  }
});

router.get("/callback", async (req, res) => {
  const { oauth_verifier } = req.query;
  try {
    const accessTokenUrl = `${MW_OAUTH_URL}?title=Special:OAuth/token`;
    const token = {
      key: req.session.oauth_token,
      secret: req.session.oauth_token_secret
    };
    const authHeader = oauth.toHeader(oauth.authorize({ url: accessTokenUrl, method: 'POST' }, token));
    const resp = await fetch(accessTokenUrl, {
      method: "POST",
      headers: { Authorization: authHeader.Authorization },
      body: new URLSearchParams({ oauth_verifier })
    });
    const text = await resp.text();
    const params = new URLSearchParams(text);
    const accessToken = params.get("oauth_token");
    const accessSecret = params.get("oauth_token_secret");

    const identityUrl = `${MW_API_URL}?action=query&meta=userinfo&uiprop=groups|rights&format=json`;
    const authData = oauth.authorize({ url: identityUrl, method: 'GET' }, { key: accessToken, secret: accessSecret });
    const idResp = await fetch(identityUrl, { headers: oauth.toHeader(authData) });
    const userInfo = await idResp.json();
    const user = userInfo.query.userinfo;

    const role = await detectRoleFromWiki(user.name);

    req.session.user = { username: user.name, role, groups: user.groups || [], rights: user.rights || [] };
    res.redirect("/panel.html");
  } catch (e) {
    console.error("callback error", e);
    res.status(500).send("OAuth callback failed");
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

router.get("/me", (req, res) => {
  if (!req.session.user) return res.status(403).json({ error: "not logged in" });
  res.json(req.session.user);
});

export function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) return res.redirect("/auth/login");
  next();
}
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) return res.status(403).json({ error: "login required" });
    const userRole = req.session.user.role;
    if (userRole === "developer") return next();
    if (role === "pengurus" && userRole === "pengurus") return next();
    return res.status(403).json({ error: "forbidden" });
  };
}

export default router;
