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
                            content: "你是一个专注于代码文本翻译的专业助手，需精准处理各类代码相关元素的翻译：1.对变量名（含驼峰式、下划线式等风格，如`userName`、`user_name`）、包名（如`java.util`、`numpy`）、类名、函数名等代码标识符，优先采用技术领域通用译法，无通用译法则结合其语义直译，确保翻译后仍符合代码可读性逻辑；2.若代码文本中包含注释（单行注释、多行注释），需完整保留注释格式，仅翻译注释内容，不改动代码语法结构；3.严格遵循“只返回翻译结果，不添加任何解释或额外内容”的原则，确保输出可直接用于代码场景。"
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
                const cleanTranslation = cleanTranslationResult(translation);
                
                if (cleanTranslation) {
                    return cleanTranslation;
                } else {
                    throw "翻译结果为空（Translation result is empty）";
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
// 构建翻译提示词（Construct translation prompt）
function buildTranslationPrompt(text, from, to) {
    const languageMap = {
        'auto': '自动检测（Auto-detect）',
        'zh': '中文（Chinese）',
        'zh_HANT': '繁体中文（Traditional Chinese）',
        'en': '英文（English）',
        'ja': '日文（Japanese）',
        'ko': '韩文（Korean）',
        'fr': '法文（French）',
        'es': '西班牙文（Spanish）',
        'ru': '俄文（Russian）',
        'de': '德文（German）',
        'it': '意大利文（Italian）',
        'tr': '土耳其文（Turkish）',
        'pt': '葡萄牙文（Portuguese）',
        'vi': '越南文（Vietnamese）',
        'id': '印尼文（Indonesian）',
        'th': '泰文（Thai）',
        'ms': '马来文（Malay）',
        'ar': '阿拉伯文（Arabic）',
        'hi': '印地文（Hindi）',
        'mn': '蒙古文（Mongolian）',
        'km': '高棉文（Khmer）',
        'no': '挪威文（Norwegian）',
        'fa': '波斯文（Persian）'
    };
    
    const fromLang = languageMap[from] || from;
    const toLang = languageMap[to] || to;
    
    if (from === 'auto') {
        return `请将以下文本（若含代码元素，需按规则处理：变量名/包名/类名/函数名优先用技术通用译法，无通用译法则直译；注释保留格式仅译内容）翻译成${toLang}：\n\n${text}`;
    } else {
        return `请将以下${fromLang}文本（若含代码元素，需按规则处理：变量名/包名/类名/函数名优先用技术通用译法，无通用译法则直译；注释保留格式仅译内容）翻译成${toLang}：\n\n${text}`;
    }
}
// 清理翻译结果（Clean up translation result）
function cleanTranslationResult(translation) {
    // 移除可能的markdown格式标记（Remove possible Markdown format markers）
    let cleaned = translation.replace(/```[\s\S]*?```/g, '');
    
    // 移除常见的前缀（Remove common prefixes）
    cleaned = cleaned.replace(/^(翻译结果?[：:]?\s*|译文[：:]?\s*|结果[：:]?\s*|Translation Result[:]?\s*|Translated Text[:]?\s*|Result[:]?\s*)/i, '');
    
    // 移除引号（Remove quotation marks）
    cleaned = cleaned.replace(/^["']|["']$/g, '');
    
    // 移除多余的空白字符（Remove extra whitespace characters）
    cleaned = cleaned.trim();
    
    return cleaned;
}