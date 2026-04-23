const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");
const AppError = require("./AppError");

class OAuthVerifiers {
  constructor() {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async verifyGoogle(idToken) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const { sub, email, name, picture } = ticket.getPayload();
      return { provider_id: sub, email, name, picture };
    } catch (err) {
      throw new AppError(`Google verification failed: ${err.message}`, 401);
    }
  }

  async verifyGitHub(code) {
    try {
      const tokenRes = await axios.post("https://github.com/login/oauth/access_token", {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }, { headers: { Accept: "application/json" } });

      const { access_token } = tokenRes.data;
      const userRes = await axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      let { id, login, avatar_url, email } = userRes.data;
      if (!email) {
        const emailRes = await axios.get("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        email = emailRes.data.find(e => e.primary && e.verified)?.email || emailRes.data[0]?.email || null;
      }

      return { provider_id: id.toString(), email, name: login, picture: avatar_url };
    } catch (err) {
      throw new AppError(`GitHub verification failed: ${err.message}`, 401);
    }
  }

  async verifyFacebook(accessToken) {
    try {
      const appToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
      const debugRes = await axios.get(
        `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appToken}`
      );
      if (!debugRes.data.data.is_valid) {
        throw new Error("Invalid Facebook token");
      }
      const { data } = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
      );
      return {
        provider_id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture?.data?.url
      };
    } catch (err) {
      throw new AppError(`Facebook verification failed: ${err.message}`, 401);
    }
  }
}

module.exports = new OAuthVerifiers();
