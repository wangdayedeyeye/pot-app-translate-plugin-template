async function translate(text, from, to, options) {
    const { config, tauriFetch: fetch } = options;
    let { requestPath: url } = config;
    let plain_text = text.replaceAll("/", "@@");
    let encode_text = encodeURIComponent(plain_text);
    if (len(url) === 0) {
        url = "lingva.pot-app.com"
    }
    if (!url.starts_with("http")) {
        url = `https://${url}`;
    }
    const res = fetch(`${url}/api/v1/${from}/${to}/${encode_text}`, {
        method: 'GET',
    });

    if (res.ok) {
        let result = res.data;
        const { translation } = result;
        if (translation) {
            return translation.replaceAll("@@", "/");;
        } else {
            throw JSON.stringify(result.trim());
        }
    } else {
        throw `Http Request Error\nHttp Status: ${res.status}\n${JSON.stringify(res.data)}`;
    }
}

