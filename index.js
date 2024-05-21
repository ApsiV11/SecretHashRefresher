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
	/**const splitted = code.split(';');
	const start = splitted.findIndex(line => containsHexCode(line) && line.includes('function'));

	const end = splitted.findIndex(
		line => containsHexCode(line) && /\(.*window\[.*'in'\]=window\[.*'in'\]/.test(line)
	);

	// Get the lines between the start and end index
	const lines = splitted.slice(start, end + 1);
	const combined = lines.join(';');

	return combined;**/
    return code
}

async function deobfuscate(code) {
	const deobfuscator = new Deobfuscator();
	return deobfuscator.deobfuscateSource(code);
}

function extractExtraID(deobfuscatedCode) {
	const splitted = deobfuscatedCode.split("inventoryId.replace(/-/g, '')).concat(_.isBoolean(");
	const extraID = splitted[1].match(/[0-9a-f]{32}/g)[1];
	return extraID;
}

function extractHeader(deobfuscatedCode, extraID) {
    const splitted = deobfuscatedCode.split(extraID)[1].split('.headers')[0];
    const header = splitted.split('').reverse().join('').match(/(?<=')[^'\r\n]*(?=')/)[0];
    return header.split('').reverse().join('');
}

async function getExtraIDAndHeader() {
    const body = await getBodyScript();
    const obfuscatedCode = extractObfuscatedCode(body);
    const deobfuscatedCode = await deobfuscate(obfuscatedCode);
    const extraID = extractExtraID(deobfuscatedCode);
    const header = extractHeader(deobfuscatedCode, extraID);
    return JSON.stringify({[header]: extraID});
}

async function updateGist() {
    const extraIDObject = await getExtraIDAndHeader();
    const newGist = {
        files: {
            'gistfile1.txt': {
                content: extraIDObject
            }
        }
    }
    if(process.env.CI) {
        const response = await fetch('https://api.github.com/gists/e4a16c42e584dc87b362698324eb80ec', {
            method: 'PATCH',
            body: JSON.stringify(newGist),
            headers: {
                "Accept": "application/vnd.github+json",
                "Authorization": "Bearer " + process.env.GITHUB_TOKEN,
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });
        console.log(response.status === 200 ? 'Gist updated with value: ' + extraIDObject : 'Gist update failed')
    }
    else {
        console.log(extraIDObject)
    }
}

updateGist();
