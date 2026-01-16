

本项目提供一个用于 Cerebras API 的 Cloudflare Workers 代理。

## 概览

- **src/index.js** – 负责将请求转发到 Cerebras 上游服务的工作脚本，处理 CORS、身份验证、API 密钥轮转以及重试逻辑。
- **wrangler.toml** – 用于使用 Wrangler 部署该 worker 的配置文件。

## 部署


在 Cloudflare 仪表板中设置所需的环境变量：

   - `AUTH_PASSWORD` – 客户端访问代理所需的密码。
   - `API_KEYS` – 用逗号分隔的 Cerebras API 密钥列表。

