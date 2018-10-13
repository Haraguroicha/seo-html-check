'use strict';

import commander from 'commander';
import cheerio from 'cheerio';
import getStdin from 'get-stdin';
import fs from 'fs';

class SeoCheck {
    constructor() {
        this._html = '';
        this._dom = null;
        this._rules = [];
    }
    async openfile(file = "-") {
        if (file == "-") {
            this._html = await getStdin();
        } else if (typeof(file) === "string") {
            this._html = fs.readFileSync(file);
        } else {
            this._html = '';
            while (null !== (chunk = file.read())) {
                this._html += chunk;
            }
        }
        this._dom = cheerio.load(this._html);
        return true;
    }
    addRule(rule) {
        this._rules.push(rule);
    }
    checkImgAlt() {
        this.addRule(d => {
            const m = d('img:not([alt])');
            if (m.length > 0) {
                throw `There are ${m.length} <img> tag without alt attribute`;
            }
        });
    }
    checkARel() {
        this.addRule(d => {
            const m = d('a:not([rel])');
            if (m.length > 0) {
                throw `There are ${m.length} <a> tag without rel attribute`;
            }
        });
    }
    checkTitle() {
        this.addRule(d => {
            const m = d('head > title');
            if (m.length == 0) {
                throw 'This HTML without <title> tag';
            }
        })
    }
    checkMetaDescriptions() {
        this.addRule(d => {
            const m = d('head > meta[name="descriptions"]');
            if (m.length == 0) {
                throw 'This HTML without <meta name="descriptions"> tag';
            }
        })
    }
    checkMetaKeywords() {
        this.addRule(d => {
            const m = d('head > meta[name="keywords"]');
            if (m.length == 0) {
                throw 'This HTML without <meta name="keywords"> tag';
            }
        })
    }
    checkManysStrong(count) {
        this.addRule(d => {
            const m = d('strong');
            if (m.length > count) {
                throw `This HTML have more than ${count} <strong> tags`;
            }
        })
    }
    checkMoreThanOnceH1() {
        this.addRule(d => {
            const m = d('h1');
            if (m.length > 1) {
                throw 'This HTML have more than one <h1> tag';
            }
        })
    }
    check(output = "-") {
        let logs = [];
        const writeLog = (log) => {
            if (output == "-") {
                console.error(log);
            } else if (typeof(output) === "string") {
                logs.push(log);
            } else {
                output.write(log);
            }
        }
        for (const rule of this._rules) {
            try {
                rule(this._dom);
            } catch(e) {
                writeLog(e);
            }
        }
        if (logs.length > 0) {
            logs.push('');
            fs.writeFileSync(output, logs.join('\n'), { flag: 'w' });
        }
        if (typeof(output) !== "string") {
            output.end();
        }
    }
}

export default new SeoCheck();

async function main() {
    const sc = new SeoCheck();

    commander
        .version('1.0.0-1', '-v, --version')
        .option('-f, --file <path>', 'Input file')
        .option('-o, --output <path>', 'Output Result')
        .option('-a, --all', 'Check All Rules', false)
        .option('-i, --no-img-alt', 'Detecting img tag without alt attribute', false)
        .option('-a, --no-a-rel', 'Detecting a tag without rel attribute', false)
        .option('-t, --no-title', 'Detecting title tag was not presented', false)
        .option('-d, --no-meta-descriptions', 'Detecting meta tag without descriptions', false)
        .option('-k, --no-meta-keywords', 'Detecting meta tag without keywords', false)
        .option('-s, --manys-strong [times]', 'Detecting strong presented in many times (default is more than 15 times)', (v, result) => { return { enabled: true, count: (v ? parseInt(v) : 15) }; }, { enabled: false, count: 15 })
        .option('-h1, --more-than-once-h1', 'Detecting H1 presented more than once', false)
        .parse(process.argv);

    if (commander.file) {
        const opened = await sc.openfile(commander.file);
    }

    if (commander.all) {
        sc.checkImgAlt();
        sc.checkARel();
        sc.checkTitle();
        sc.checkMetaDescriptions();
        sc.checkMetaKeywords();
        commander.manysStrong.enabled = true;
        sc.checkMoreThanOnceH1();
    } else {
        if (!commander.imgAlt) {
            sc.checkImgAlt();
        }
        if (!commander.aRel) {
            sc.checkARel();
        }
        if (!commander.title) {
            sc.checkTitle();
        }
        if (!commander.metaDescriptions) {
            sc.checkMetaDescriptions();
        }
        if (!commander.metaKeywords) {
            sc.checkMetaKeywords();
        }
        if (commander.moreThanOnceH1) {
            sc.checkMoreThanOnceH1();
        }
    }
    if (commander.manysStrong.enabled) {
        sc.checkManysStrong(commander.manysStrong.count);
    }

    sc.check(commander.output);
}
main();
