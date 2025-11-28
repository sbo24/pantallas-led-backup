const showIconFallbackMap = {
    "El Último Cantar": "show-01.png",
    "El tambor de la Libertad": "show-06.png",
    "A Pluma y Espada": "show-02.png",
    "Cetrería de Reyes": "show-04.png",
    "El Misterio de Sorbaces": "show-05.png",
    "Allende la Mar Océana": "show-03.png",
    "De Tal Palo": "show-03.png",
    "El Espadero de Vivar": "show-04.png",
    "El Sueño de Toledo": "night-show.png",
    "Apertura": "show-01.png",
    "Cierre": "show-06.png",
    "La Alegría de la Navidad": "show-04.png"
};

function getIcon(nameFromApi) {
    console.log(`Testing name: "${nameFromApi}"`);

    const showName = (nameFromApi || '').trim();
    console.log(`Trimmed name: "${showName}"`);

    // Intento 1: Coincidencia exacta
    if (showIconFallbackMap[showName]) {
        console.log("Match found (exact)!");
        return showIconFallbackMap[showName];
    }

    // Intento 2: Coincidencia insensible a mayúsculas/minúsculas
    const lowerName = showName.toLowerCase();
    console.log(`Lower name: "${lowerName}"`);

    const mapKey = Object.keys(showIconFallbackMap).find(k => {
        const kLower = k.toLowerCase();
        // console.log(`Comparing with "${kLower}"`);
        return kLower === lowerName;
    });

    if (mapKey) {
        console.log(`Match found (case-insensitive) with key: "${mapKey}"`);
        return showIconFallbackMap[mapKey];
    }

    console.log("No match found.");
    return "FALLBACK";
}

// Test with the string from the API
const apiString = "La Alegría de la Navidad";
console.log(`Result: ${getIcon(apiString)}`);

// Test with potential encoding issues (NFC vs NFD)
const nfc = apiString.normalize('NFC');
const nfd = apiString.normalize('NFD');
console.log(`\nTesting NFC: "${nfc}" -> ${getIcon(nfc)}`);
console.log(`Testing NFD: "${nfd}" -> ${getIcon(nfd)}`);
