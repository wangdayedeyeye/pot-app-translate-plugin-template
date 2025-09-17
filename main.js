async function translate(text, from, to, options) {
    const { config, utils } = options;
    const { tauriFetch: fetch } = utils;
    let { requestPath: url } = config;
    
    // 设置默认的本地qwen3-4b模型地址（Set default local qwen3-4b model address）
    if (url === undefined || url.length === 0) {
        url = "http://localhost:1234";
    }
    if (!url.startsWith("http")) {
        url = `http://${url}`;
    }
    // 构建适合大模型的prompt（Construct prompt suitable for large model）
    // const prompt = buildVariableNamePrompt(text);
    const prompt = text;
    
    try {
        const res = await fetch(`${url}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: {
                type: 'Json',
                payload: {
                    model: "qwen3-4b-instruct-2507",
                    messages: [
                        {
                            role: "system",
                            content: "你是一个专业的变量名还原助手。你的任务是将多单词构成的变量名（如驼峰命名法、下划线命名法等）拆分为单个单词，并提供每个单词的中文翻译。请严格按照要求的格式输出：每行一个单词及其中文翻译，格式为'单词 - 中文'。不要添加任何额外的解释或说明。"
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 2048,
                    stream: false
                }
            }
        });
        if (res.ok) {
            let result = res.data;
            
            // 处理OpenAI格式的响应（Process response in OpenAI format）
            if (result.choices && result.choices.length > 0) {
                const translation = result.choices[0].message.content.trim();
                
                // 清理可能的格式标记（Clean up possible format markers）
                const cleanTranslation = cleanVariableNameResult(translation);
                
                if (cleanTranslation) {
                    return cleanTranslation;
                } else {
                    throw "变量名拆分结果为空（Variable name splitting result is empty）";
                }
            } else {
                throw "模型返回格式错误: " + JSON.stringify(result) + "（Model return format error）";
            }
        } else {
            throw `Http Request Error\nHttp Status: ${res.status}\n${JSON.stringify(res.data)}（HTTP请求错误，HTTP状态码：${res.status}）`;
        }
    } catch (error) {
        // 如果是网络错误，提供更友好的错误信息（If it is a network error, provide more user-friendly error information）
        if (error.message && error.message.includes('fetch')) {
            throw "无法连接到本地qwen3-4b模型，请确保模型服务正在运行（Failed to connect to local qwen3-4b model, please ensure the model service is running）";
        }
        throw error;
    }
}
// 构建变量名拆分提示词（Construct variable name splitting prompt）
// function buildVariableNamePrompt(text) {
//     return `# 角色：变量名还原助手\n1. 功能：将多单词构成的变量名拆分为单个单词（空格分隔）；\n2. 输出：拆分后的每个单词及其中文翻译，一行一个（格式示例：单词 - 中文）。\n\n${text}`;
// }
// 清理变量名拆分结果（Clean up variable name splitting result）
function cleanVariableNameResult(result) {
    // 移除可能的markdown格式标记（Remove possible Markdown format markers）
    let cleaned = result.replace(/```[\s\S]*?```/g, '');
    
    // 移除常见的前缀（Remove common prefixes）
    cleaned = cleaned.replace(/^(拆分结果?[：:]?\s*|结果[：:]?\s*|变量名拆分[：:]?\s*|Result[:]?\s*|Variable Name Split[:]?\s*)/i, '');
    
    // 移除引号（Remove quotation marks）
    cleaned = cleaned.replace(/^["']|["']$/g, '');
    
    // 移除多余的空白字符（Remove extra whitespace characters）
    cleaned = cleaned.trim();
    
    return cleaned;
}