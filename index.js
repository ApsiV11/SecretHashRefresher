import { Deobfuscator } from 'deobfuscator';
import 'dotenv/config';

const BODY_URL = 'https://kide.app/scripts/body.js'

function containsHexCode(str) {
	// Regular expression to match the hexadecimal pattern
	const hexPattern = /(_0x|0x)[0-9a-fA-F]+/g;

	// Search the string for the pattern
	return hexPattern.test(str);
}

async function getBodyScript() {
    const response = await fetch(BODY_URL);
    const body = await response.text();
    return body;
}

function extractObfuscatedCode(code) {
	const splitted = code.split(';');
	const start = splitted.findIndex(line => containsHexCode(line) && line.startsWith('function'));

	const end = splitted.findIndex(
		line => containsHexCode(line) && /\(.*window\[.*'in'\]=window\[.*'in'\]/.test(line)
	);

	// Get the lines between the start and end index
	const lines = splitted.slice(start, end + 1);
	const combined = lines.join(';');

	return combined;
}

async function deobfuscate(code) {
	const deobfuscator = new Deobfuscator();
	return deobfuscator.deobfuscateSource(code);
}

function extractExtraID(deobfuscatedCode) {
	const splitted = deobfuscatedCode.split(".replace(/-/g, '')).concat(_.isBoolean(");
	const extraID = splitted[1].split("'")[3].replaceAll('-', '');
	return extraID;
}

async function getExtraID() {
    const body = await getBodyScript();
    const obfuscatedCode = extractObfuscatedCode(body);
    const deobfuscatedCode = await deobfuscate(obfuscatedCode);
    const extraID = extractExtraID(deobfuscatedCode);
    return extraID;
}

async function updateGist() {
    const extraID = await getExtraID();
    console.log(extraID)
    const newGist = {
        files: {
            'gistfile1.txt': {
                content: extraID
            }
        }
    }
    const response = await fetch('https://api.github.com/gists/e4a16c42e584dc87b362698324eb80ec', {
        method: 'PATCH',
        body: JSON.stringify(newGist),
        headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": "Bearer " + process.env.GITHUB_TOKEN,
            "X-GitHub-Api-Version": "2022-11-28"
        }
    });
    console.log(response.status === 200 ? 'Gist updated' : 'Gist update failed')
}

updateGist();
