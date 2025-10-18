import express from "express";
import session from "express-session";
import fetch from "node-fetch";
import crypto from "crypto";
import OAuth from "oauth-1.0a";

const router = express.Router();

const {
  MW_OAUTH_KEY,
  MW_OAUTH_SECRET,
  MW_API_URL,
  MW_OAUTH_URL,
  APP_BASE_URL,
} = process.env;

const oauth = OAuth({
  consumer: { key: MW_OAUTH_KEY, secret: MW_OAUTH_SECRET },
  signature_method: "HMAC-SHA1",
  hash_function(base_string, key) {
    return crypto.createHmac("sha1", key).update(base_string).digest("base64");
  },
});

router.use(
  session({
    secret: "stbr_session_secret",
    resave: false,
    saveUninitialized: false,
  })
);

router.get("/login", async (req, res) => {
  try {
    const requestTokenUrl = `${MW_OAUTH_URL}?title=Special:OAuth/initiate`;
    const authorizeUrl = `${MW_OAUTH_URL}?title=Special:OAuth/authorize`;

    const requestOptions = {
      url: requestTokenUrl,
      method: "POST",
      data: {
        oauth_callback: `${APP_BASE_URL}/auth/callback`,
      },
    };

    const authHeader = oauth.toHeader(
      oauth.authorize(requestOptions)
    );

    const resp = await fetch(requestTokenUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader.Authorization,
      },
    });

    const text = await resp.text();
    const params = new URLSearchParams(text);
    const token = params.get("oauth_token");
    const secret = params.get("oauth_token_secret");

    if (!token || !secret)
      return res.status(500).send("Failed to get request token.");

    req.session.oauth_token = token;
    req.session.oauth_token_secret = secret;

    res.redirect(`${authorizeUrl}&oauth_token=${token}`);
  } catch (e) {
    console.error(e);
    res.status(500).send("OAuth initiation failed");
  }
});

router.get("/callback", async (req, res) => {
  const { oauth_verifier, oauth_token } = req.query;

  if (!oauth_verifier || !oauth_token)
    return res.status(400).send("Missing verifier or token.");

  try {
    const accessTokenUrl = `${MW_OAUTH_URL}?title=Special:OAuth/token`;
    const requestData = { url: accessTokenUrl, method: "POST" };

    const token = {
      key: req.session.oauth_token,
      secret: req.session.oauth_token_secret,
    };

    const authHeader = oauth.toHeader(
      oauth.authorize(requestData, token)
    );

    const resp = await fetch(accessTokenUrl, {
      method: "POST",
      headers: { Authorization: authHeader.Authorization },
      body: new URLSearchParams({ oauth_verifier }),
    });

    const text = await resp.text();
    const params = new URLSearchParams(text);

    const accessToken = params.get("oauth_token");
    const accessSecret = params.get("oauth_token_secret");

    if (!accessToken || !accessSecret)
      return res.status(500).send("Failed to get access token.");

    const identityUrl = `${MW_API_URL}?action=query&meta=userinfo&uiprop=groups|rights&format=json`;

    const authData = oauth.authorize({ url: identityUrl, method: "GET" }, {
      key: accessToken,
      secret: accessSecret,
    });

    const idResp = await fetch(identityUrl, {
      headers: oauth.toHeader(authData),
    });

    const userInfo = await idResp.json();
    const user = userInfo.query.userinfo;

    let role = "pengguna";
    if (user.groups.includes("sysop") || user.groups.includes("bureaucrat")) {
      role = "pengurus";
    }
    if (user.name === "Janorovic Volkov") {
      role = "developer";
    }

    req.session.user = {
      username: user.name,
      groups: user.groups,
      rights: user.rights,
      role,
    };

    res.redirect("/panel");
  } catch (e) {
    console.error(e);
    res.status(500).send("OAuth callback failed");
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

export function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect("/auth/login");
    const roles = ["pengguna", "pengurus", "developer"];
    if (!roles.includes(role)) return res.status(403).send("Invalid role.");

    const userRole = req.session.user.role;
    if (
      userRole === "developer" ||
      (role === "pengurus" && userRole === "pengurus")
    ) {
      return next();
    }

    res.status(403).send("Access denied.");
  };
}

export default router;
