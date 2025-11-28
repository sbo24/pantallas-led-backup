const showIconFallbackMap = {
    "La Alegría de la Navidad": "show-04.png"
};

function getIcon(nameFromApi) {
    console.log(`Testing name: "${nameFromApi}"`);

    // Normalizar a NFC para manejar acentos consistentemente
    const normalize = (str) => str.normalize('NFC');

    const showName = (nameFromApi || '').trim();
    const normalizedShowName = normalize(showName);
    console.log(`Normalized name: "${normalizedShowName}"`);

    // Intento 1: Coincidencia exacta (normalizada)
    const exactKey = Object.keys(showIconFallbackMap).find(k => normalize(k) === normalizedShowName);
    if (exactKey) {
        console.log(`Match found (exact normalized) with key: "${exactKey}"`);
        return showIconFallbackMap[exactKey];
    }

    // Intento 2: Coincidencia insensible a mayúsculas/minúsculas (normalizada)
    const lowerName = normalizedShowName.toLowerCase();
    const mapKey = Object.keys(showIconFallbackMap).find(k => normalize(k).toLowerCase() === lowerName);
    if (mapKey) {
        console.log(`Match found (case-insensitive normalized) with key: "${mapKey}"`);
        return showIconFallbackMap[mapKey];
    }

    console.log("No match found.");
    return "FALLBACK";
}

// Test with NFD string (which failed before)
const apiString = "La Alegría de la Navidad";
const nfd = apiString.normalize('NFD');
console.log(`\nTesting NFD: "${nfd}" -> ${getIcon(nfd)}`);
