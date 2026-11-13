<div align="center">

# ♛ Crown Code

### Free, open-source AI assistant built only for code.

[![Open Source](https://img.shields.io/badge/OPEN%20SOURCE-MIT-2ea44f?style=for-the-badge&logo=opensourceinitiative&logoColor=white&labelColor=1a1a1a)](LICENSE)
[![Made By Adarsh](https://img.shields.io/badge/MADE%20BY-ADARSH-ff1493?style=for-the-badge&logo=github&logoColor=white&labelColor=1a1a1a)](https://devvadarsh.github.io/crownlab)
![Cost](https://img.shields.io/badge/COST-FREE-2ea44f?style=for-the-badge&labelColor=1a1a1a)
![Gemini](https://img.shields.io/badge/POWERED%20BY-GEMINI-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white&labelColor=1a1a1a)

</div>

## ✨ Features
- Writes, explains, reviews and fixes code with high-quality answers.
- Coding only: other topics get a polite redirect.
- Knows its creator, **Devvadarsh (Adarsh) of Crown Lab**, and his projects.
- Clean chat UI with code blocks and a one-click **Copy** button.
- Chats are saved **only in your browser** (local history) and can be deleted anytime.
- No sign-up and no key needed for users: it runs on the owner's server key.
- Light and dark mode, works on phone and desktop.

## 🚀 Deploy (Cloudflare Pages, free)
1. Put this whole folder in a GitHub repo (`index.html`, `functions/api/chat.js`, `README.md`, `LICENSE`).
2. Cloudflare → **Workers & Pages → Create → Pages → Import an existing Git repository**.
3. Build command: empty. Build output directory: `/`.
4. After deploy: **Settings → Variables and Secrets → Add** `GEMINI_KEY` (type **Secret**) = your Gemini API key. Redeploy once.
5. Optional: add a Cloudflare **Rate limiting rule** for `/api/chat` to protect your free quota.

The API key lives only on the server, never in the code or the browser. Never commit it to GitHub. Users need no key.

## 🤝 Contribute
Fork, change `index.html`, and open a pull request. Issues and ideas are welcome.

## 📜 License
MIT. See [LICENSE](LICENSE).

---
Made with ❤️ by **Adarsh** · [Crown Lab](https://devvadarsh.github.io/crownlab)
