async function translate(text, from, to, options) {
    const { config, utils } = options;
    const { tauriFetch: fetch } = utils;
    let { requestPath: url } = config;
    
    // 设置默认的本地qwen3-4b模型地址
    if (url === undefined || url.length === 0) {
        url = "http://localhost:1234";
    }
    if (!url.startsWith("http")) {
        url = `http://${url}`;
    }

    // 构建适合大模型的prompt
    const prompt = buildTranslationPrompt(text, from, to);
    
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
                            content: "你是一个专业的翻译助手，请准确翻译用户提供的文本，只返回翻译结果，不要添加任何解释或额外内容。"
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
            
            // 处理OpenAI格式的响应
            if (result.choices && result.choices.length > 0) {
                const translation = result.choices[0].message.content.trim();
                
                // 清理可能的格式标记
                const cleanTranslation = cleanTranslationResult(translation);
                
                if (cleanTranslation) {
                    return cleanTranslation;
                } else {
                    throw "翻译结果为空";
                }
            } else {
                throw "模型返回格式错误: " + JSON.stringify(result);
            }
        } else {
            throw `Http Request Error\nHttp Status: ${res.status}\n${JSON.stringify(res.data)}`;
        }
    } catch (error) {
        // 如果是网络错误，提供更友好的错误信息
        if (error.message && error.message.includes('fetch')) {
            throw "无法连接到本地qwen3-4b模型，请确保模型服务正在运行";
        }
        throw error;
    }
}

// 构建翻译提示词
function buildTranslationPrompt(text, from, to) {
    const languageMap = {
        'auto': '自动检测',
        'zh': '中文',
        'zh_HANT': '繁体中文',
        'en': '英文',
        'ja': '日文',
        'ko': '韩文',
        'fr': '法文',
        'es': '西班牙文',
        'ru': '俄文',
        'de': '德文',
        'it': '意大利文',
        'tr': '土耳其文',
        'pt': '葡萄牙文',
        'vi': '越南文',
        'id': '印尼文',
        'th': '泰文',
        'ms': '马来文',
        'ar': '阿拉伯文',
        'hi': '印地文',
        'mn': '蒙古文',
        'km': '高棉文',
        'no': '挪威文',
        'fa': '波斯文'
    };
    
    const fromLang = languageMap[from] || from;
    const toLang = languageMap[to] || to;
    
    if (from === 'auto') {
        return `请将以下文本翻译成${toLang}：\n\n${text}`;
    } else {
        return `请将以下${fromLang}文本翻译成${toLang}：\n\n${text}`;
    }
}

// 清理翻译结果
function cleanTranslationResult(translation) {
    // 移除可能的markdown格式标记
    let cleaned = translation.replace(/```[\s\S]*?```/g, '');
    
    // 移除常见的前缀
    cleaned = cleaned.replace(/^(翻译结果?[：:]?\s*|译文[：:]?\s*|结果[：:]?\s*)/i, '');
    
    // 移除引号
    cleaned = cleaned.replace(/^["']|["']$/g, '');
    
    // 移除多余的空白字符
    cleaned = cleaned.trim();
    
    return cleaned;
}
