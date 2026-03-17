function pickName(username, displayName) {
    if (!displayName) return username;

    const names = [displayName, username];

    const digitCounts = names.map(name => (name.match(/\d/g) || []).length);
    const minIndex = digitCounts[0] > digitCounts[1] ? 1 : 0;

    return names[minIndex];
}

function sanitizeMessage(text) {
    let processed = text
        .replace(/<a?:([^:\s>]+):\d+>/g, "emoji $1") // emoji processing
        .replace(
            /https?:\/\/tenor\.com\/view\/([a-zA-Z-]+)-gif-\d+/g,
            (_, slug) => slug.replace(/-/g, " ")
        ) // tenor gifs keyword extraction
        .replace(
            /\bhttps?:\/\/([^\s\/]+)(?:\/\S+)?(?:\.(gif|png|jpe?g|webp|mp4|mov|html))?(\?\S*)?\b/gi,
            (_, domain, ext) => `lien vers ${domain}${ext ? ` fichier ${ext.toLowerCase()}` : ""}`
        ) // other files and links
        .replace(/\s+/g, " ")
        .trim();

    return processed;
}

module.exports = { sanitizeMessage, pickName };