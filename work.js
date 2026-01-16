/**
 * 配置区域 (非敏感信息)
 */
const CONFIG = {
  // 上游服务商地址
  UPSTREAM_URL: 'api.cerebras.ai',
  // 上游是否使用 HTTPS
  HTTPS: true,
  // 最大重试次数
  MAX_RETRIES: 2
};

export default {
  async fetch(request, env, ctx) {
    // 1. 处理 CORS 预检请求 (无需密码，必须放行，否则前端会报错)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // 2. 安全检查：验证访问密码 (从环境变量获取)
    // 客户端发送的格式通常是: "Bearer 你的密码"
    const authHeader = request.headers.get('Authorization') || '';
    const myPassword = env.AUTH_PASSWORD; // 获取环境变量里的密码

    // 如果没设密码或者密码不对
    if (!myPassword || !authHeader.includes(myPassword)) {
      return new Response(JSON.stringify({ 
        error: "Unauthorized", 
        message: "Access Denied: Invalid Password" 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. 获取 API Key 池 (从环境变量获取，并用逗号分割)
    if (!env.API_KEYS) {
       return new Response('Error: API_KEYS not set in environment variables', { status: 500 });
    }
    // 将字符串 "key1,key2,key3" 切割成数组
    const keyPool = env.API_KEYS.split(',').map(k => k.trim()).filter(k => k);

    // 4. 准备请求
    const url = new URL(request.url);
    url.host = CONFIG.UPSTREAM_URL;
    url.protocol = CONFIG.HTTPS ? 'https:' : 'http:';

    // 5. 执行带重试的请求
    return await handleRequestWithRetry(request, url, keyPool);
  },
};

/**
 * 核心逻辑：带重试的请求发送
 */
async function handleRequestWithRetry(originalRequest, targetUrl, keyPool, retryCount = 0) {
  // 随机挑选一个 Key
  const currentKey = keyPool[Math.floor(Math.random() * keyPool.length)];

  // 构造新 Header：替换掉用户的密码，换成真实的 API Key
  const newHeaders = new Headers(originalRequest.headers);
  newHeaders.set('Authorization', `Bearer ${currentKey}`);
  newHeaders.set('Host', CONFIG.UPSTREAM_URL);

  const newRequest = new Request(targetUrl, {
    method: originalRequest.method,
    headers: newHeaders,
    body: originalRequest.body,
    redirect: 'follow',
  });

  try {
    const response = await fetch(newRequest);

    // 遇到 429 (限速) 或 401 (Key失效) 时重试
    if ((response.status === 429 || response.status === 401) && retryCount < CONFIG.MAX_RETRIES) {
      console.log(`Key ending in ...${currentKey.slice(-4)} failed. Retrying...`);
      return await handleRequestWithRetry(originalRequest, targetUrl, keyPool, retryCount + 1);
    }

    // 返回响应
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    return newResponse;

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}