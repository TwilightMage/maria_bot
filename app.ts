import config from './config.json';
import {
    Client,
    GuildMember,
    GuildTextBasedChannel, HexColorString,
    Intents,
    Message,
    MessageEmbed,
    TextBasedChannel,
    TextChannel
} from "discord.js";
import commands, {Command} from "./commands";
import Database from "./database";
import {oneOf, oneOfIndex} from "./utils";
import DiscordGateway from "./discord_gateway";
import googlethis from 'googlethis';
import schedule from 'node-schedule';
import Cache from "./cache";
import Commands from "./commands";
import Talk from "./talk";

//interface Muted {
//    tag: string;
//    id: string;
//    guild_id: string;
//    job: any;
//    end_time: Date;
//}
//
//interface MutedCache {
//    tag: string;
//    id: string;
//    guild_id: string;
//    end_time: string;
//}
//
//function startUnmuteJob(id: string, guild_id: string, end_time: Date): any {
//    return schedule.scheduleJob(end_time, async () => {
//        const guild = App.instance.client.guilds.cache.get(guild_id);
//        if (guild != undefined) {
//            const member = guild.members.cache.get(id);
//            if (member != undefined) {
//                if (member.roles.cache.has(config.mute_role)) {
//                    await member.roles.remove(config.mute_role);
//                    (guild.channels.cache.get(/*config.general_channel*/'973580137582981161') as TextBasedChannel).send(`@${member.user.tag} теперь размучен`)
//                }
//            }
//        }
//        App.instance.mute_list.delete(id);
//    });
//}
//
//commands['mute'] = new Command({description: 'Замутить кого то', format: '<цель> <время в минутах>', roles: ['кусь'], action: async (args: Array<string>, command_message: Message) => {
//    let target: GuildMember = null;
//    if (/^<@\d+>$/.test(args[2])) {
//        const id = args[2].substring(2, args[2].length - 1);
//        target = command_message.guild.members.cache.get(id);
//    }
//    if (target == null) {
//        await command_message.reply('Я не могу найти такого пользователя')
//        return;
//    } else if (target.user.id == config.draco_id) {
//        await command_message.reply(oneOf(['Низачто', 'Никогда', 'Я не стану мутить ее', 'А может тебя замутить?']));
//        return;
//    }
//
//    const minutes = parseInt(args[3]);
//    if (isNaN(minutes)) {
//        await command_message.reply('Время указано неверно, должно быть число минут')
//        return;
//    }
//    const end_time = new Date(new Date().getTime() + 60000 * minutes);
//
//    await target.roles.add(config.mute_role);
//
//    let entry = App.instance.mute_list[target.user.id];
//    if (entry == undefined) {
//        App.instance.mute_list[target.id] = {
//            tag: target.user.tag,
//            id: target.user.id,
//            guild_id: target.guild.id,
//            job: startUnmuteJob(target.user.id, target.guild.id, end_time),
//            end_time: end_time
//        };
//
//        let cached_muted: Array<MutedCache> = Cache.getValue('muted', []);
//        cached_muted.push({
//            tag: target.user.tag,
//            id: target.user.id,
//            guild_id: target.guild.id,
//            end_time: end_time.toISOString()
//        });
//        Cache.setValue('muted', cached_muted);
//    }
//
//    }});

const html_escape_entities = {"&larr;":"←","&uarr;":"↑","&rarr;":"→","&darr;":"↓","&harr;":"↔","&varr;":"↕","&nwarr;":"↖","&nearr;":"↗","&searr;":"↘","&swarr;":"↙","&nlarr;":"↚","&nrarr;":"↛","&larrw;":"↜","&rarrw;":"↝","&Larr;":"↞","&Uarr;":"↟","&Rarr;":"↠","&Darr;":"↡","&larrtl;":"↢","&rarrtl;":"↣","&mapstoleft;":"↤","&mapstoup;":"↥","&mapstoright;":"↦","&mapstodown;":"↧","&larrhk;":"↩","&rarrhk;":"↪","&larrlp;":"↫","&rarrlp;":"↬","&harrw;":"↭","&nharr;":"↮","&lsh;":"↰","&rsh;":"↱","&ldsh;":"↲","&rdsh;":"↳","&crarr;":"↵","&cularr;":"↶","&curarr;":"↷","&olarr;":"↺","&orarr;":"↻","&lharu;":"↼","&lhard;":"↽","&uharr;":"↾","&uharl;":"↿","&rharu;":"⇀","&rhard;":"⇁","&dharr;":"⇂","&dharl;":"⇃","&rlarr;":"⇄","&udarr;":"⇅","&lrarr;":"⇆","&llarr;":"⇇","&uuarr;":"⇈","&rrarr;":"⇉","&ddarr;":"⇊","&lrhar;":"⇋","&rlhar;":"⇌","&nlArr;":"⇍","&nhArr;":"⇎","&nrArr;":"⇏","&lArr;":"⇐","&uArr;":"⇑","&rArr;":"⇒","&dArr;":"⇓","&hArr;":"⇔","&vArr;":"⇕","&nwArr;":"⇖","&neArr;":"⇗","&seArr;":"⇘","&swArr;":"⇙","&lAarr;":"⇚","&rAarr;":"⇛","&ziglarr;":"⇜","&zigrarr;":"⇝","&larrb;":"⇤","&rarrb;":"⇥","&duarr;":"⇵","&loarr;":"⇽","&roarr;":"⇾","&hoarr;":"⇿","&xlarr;":"⟵","&xrarr;":"⟶","&xharr;":"⟷","&xlArr;":"⟸","&xrArr;":"⟹","&xhArr;":"⟺","&xmap;":"⟼","&dzigrarr;":"⟿","&nvlArr;":"⤂","&nvrArr;":"⤃","&nvHarr;":"⤄","&Map;":"⤅","&lbarr;":"⤌","&rbarr;":"⤍","&lBarr;":"⤎","&rBarr;":"⤏","&RBarr;":"⤐","&DDotrahd;":"⤑","&UpArrowBar;":"⤒","&DownArrowBar;":"⤓","&Rarrtl;":"⤖","&latail;":"⤙","&ratail;":"⤚","&lAtail;":"⤛","&rAtail;":"⤜","&larrfs;":"⤝","&rarrfs;":"⤞","&larrbfs;":"⤟","&rarrbfs;":"⤠","&nwarhk;":"⤣","&nearhk;":"⤤","&searhk;":"⤥","&swarhk;":"⤦","&nwnear;":"⤧","&nesear;":"⤨","&seswar;":"⤩","&swnwar;":"⤪","&rarrc;":"⤳","&cudarrr;":"⤵","&ldca;":"⤶","&rdca;":"⤷","&cudarrl;":"⤸","&larrpl;":"⤹","&curarrm;":"⤼","&cularrp;":"⤽","&rarrpl;":"⥅","&harrcir;":"⥈","&Uarrocir;":"⥉","&lurdshar;":"⥊","&ldrushar;":"⥋","&LeftRightVector;":"⥎","&RightUpDownVector;":"⥏","&DownLeftRightVector;":"⥐","&LeftUpDownVector;":"⥑","&LeftVectorBar;":"⥒","&RightVectorBar;":"⥓","&RightUpVectorBar;":"⥔","&RightDownVectorBar;":"⥕","&DownLeftVectorBar;":"⥖","&DownRightVectorBar;":"⥗","&LeftUpVectorBar;":"⥘","&LeftDownVectorBar;":"⥙","&LeftTeeVector;":"⥚","&RightTeeVector;":"⥛","&RightUpTeeVector;":"⥜","&RightDownTeeVector;":"⥝","&DownLeftTeeVector;":"⥞","&DownRightTeeVector;":"⥟","&LeftUpTeeVector;":"⥠","&LeftDownTeeVector;":"⥡","&lHar;":"⥢","&uHar;":"⥣","&rHar;":"⥤","&dHar;":"⥥","&luruhar;":"⥦","&ldrdhar;":"⥧","&ruluhar;":"⥨","&rdldhar;":"⥩","&lharul;":"⥪","&llhard;":"⥫","&rharul;":"⥬","&lrhard;":"⥭","&udhar;":"⥮","&duhar;":"⥯","&RoundImplies;":"⥰","&erarr;":"⥱","&simrarr;":"⥲","&larrsim;":"⥳","&rarrsim;":"⥴","&rarrap;":"⥵","&ltlarr;":"⥶","&gtrarr;":"⥸","&subrarr;":"⥹","&suplarr;":"⥻","&lfisht;":"⥼","&rfisht;":"⥽","&ufisht;":"⥾","&dfisht;":"⥿","&dollar;":"$","&cent;":"¢","&pound;":"£","&euro;":"€","&yen;":"¥","&curren;":"¤","&Agrave;":"à","&Aacute;":"á","&Acirc;":"â","&Atilde;":"ã","&Auml;":"ä","&Aring;":"å","&AElig;":"æ","&Ccedil;":"ç","&Egrave;":"è","&Eacute;":"é","&Ecirc;":"ê","&Euml;":"ë","&Lgrave;":"ì","&Lacute;":"ĺ","&Lcirc;":"î","&Luml;":"ï","&ETH;":"ð","&Ntilde;":"ñ","&Ograve;":"ò","&Oacute;":"ó","&Ocirc;":"ô","&Otilde;":"õ","&Ouml;":"ö","&Oslash;":"ø","&Ugrave;":"ù","&Uacute;":"ú","&Ucirc;":"û","&Uuml;":"ü","&Yacute;":"ý","&THORN;":"þ","&szlig;":"ß","&agrave;":"à","&aacute;":"á","&acirc;":"â","&atilde;":"ã","&auml;":"ä","&aring;":"å","&aelig;":"æ","&ccedil;":"ç","&egrave;":"è","&eacute;":"é","&ecirc;":"ê","&euml;":"ë","&igrave;":"ì","&iacute;":"í","&icirc;":"î","&iuml;":"ï","&eth;":"ð","&ntilde;":"ñ","&ograve;":"ò","&oacute;":"ó","&ocirc;":"ô","&otilde;":"õ","&ouml;":"ö","&oslash;":"ø","&ugrave;":"ù","&uacute;":"ú","&ucirc;":"û","&uuml;":"ü","&yacute;":"ý","&thorn;":"þ","&yuml;":"ÿ","&Amacr;":"ā","&amacr;":"ā","&Abreve;":"ă","&abreve;":"ă","&Aogon;":"ą","&aogon;":"ą","&Cacute;":"ć","&cacute;":"ć","&Ccirc;":"ĉ","&ccirc;":"ĉ","&Cdot;":"ċ","&cdot;":"ċ","&Ccaron;":"č","&ccaron;":"č","&Dcaron;":"ď","&dcaron;":"ď","&Dstrok;":"đ","&dstrok;":"đ","&Emacr;":"ē","&emacr;":"ē","&Edot;":"ė","&edot;":"ė","&Eogon;":"ę","&eogon;":"ę","&Ecaron;":"ě","&ecaron;":"ě","&Gcirc;":"ĝ","&gcirc;":"ĝ","&Gbreve;":"ğ","&gbreve;":"ğ","&Gdot;":"ġ","&gdot;":"ġ","&Gcedil;":"ģ","&Hcirc;":"ĥ","&hcirc;":"ĥ","&Hstrok;":"ħ","&hstrok;":"ħ","&Itilde;":"ĩ","&itilde;":"ĩ","&Imacr;":"ī","&imacr;":"ī","&Iogon;":"į","&iogon;":"į","&Idot;":"i̇","&imath;":"ı","&IJlig;":"ĳ","&ijlig;":"ĳ","&Jcirc;":"ĵ","&jcirc;":"ĵ","&Kcedil;":"ķ","&kcedil;":"ķ","&kgreen;":"ĸ","&lacute;":"ĺ","&Lcedil;":"ļ","&lcedil;":"ļ","&Lcaron;":"ľ","&lcaron;":"ľ","&Lmidot;":"ŀ","&lmidot;":"ŀ","&Lstrok;":"ł","&lstrok;":"ł","&Nacute;":"ń","&nacute;":"ń","&Ncedil;":"ņ","&ncedil;":"ņ","&Ncaron;":"ň","&ncaron;":"ň","&napos;":"ŉ","&ENG;":"ŋ","&eng;":"ŋ","&Omacr;":"ō","&omacr;":"ō","&Odblac;":"ő","&odblac;":"ő","&OElig;":"œ","&oelig;":"œ","&Racute;":"ŕ","&racute;":"ŕ","&Rcedil;":"ŗ","&rcedil;":"ŗ","&Rcaron;":"ř","&rcaron;":"ř","&Sacute;":"ś","&sacute;":"ś","&Scirc;":"ŝ","&scirc;":"ŝ","&Scedil;":"ş","&scedil;":"ş","&Scaron;":"š","&scaron;":"š","&Tcedil;":"ţ","&tcedil;":"ţ","&Tcaron;":"ť","&tcaron;":"ť","&Tstrok;":"ŧ","&tstrok;":"ŧ","&Utilde;":"ũ","&utilde;":"ũ","&Umacr;":"ū","&umacr;":"ū","&Ubreve;":"ŭ","&ubreve;":"ŭ","&Uring;":"ů","&uring;":"ů","&Udblac;":"ű","&udblac;":"ű","&Uogon;":"ų","&uogon;":"ų","&Wcirc;":"ŵ","&wcirc;":"ŵ","&Ycirc;":"ŷ","&ycirc;":"ŷ","&Yuml;":"ÿ","&Zacute;":"ź","&zacute;":"ź","&Zdot;":"ż","&zdot;":"ż","&Zcaron;":"ž","&zcaron;":"ž","&DownBreve;":"̑","&plus;":"+","&minus;":"−","&times;":"×","&divide;":"÷","&equals;":"=","&ne;":"≠","&plusmn;":"±","&not;":"¬","&lt;":"<","&gt;":">","&deg;":"°","&sup1;":"¹","&sup2;":"²","&sup3;":"³","&fnof;":"ƒ","&percnt;":"%","&permil;":"‰","&pertenk;":"‱","&forall;":"∀","&comp;":"∁","&part;":"∂","&exist;":"∃","&nexist;":"∄","&empty;":"∅","&nabla;":"∇","&isin;":"∈","&notin;":"∉","&ni;":"∋","&notni;":"∌","&prod;":"∏","&coprod;":"∐","&sum;":"∑","&mnplus;":"∓","&plusdo;":"∔","&setminus;":"∖","&lowast;":"∗","&compfn;":"∘","&radic;":"√","&prop;":"∝","&infin;":"∞","&angrt;":"∟","&ang;":"∠","&angmsd;":"∡","&angsph;":"∢","&mid;":"∣","&nmid;":"∤","&parallel;":"∥","&npar;":"∦","&and;":"∧","&or;":"∨","&cap;":"∩","&cup;":"∪","&int;":"∫","&Int;":"∬","&iiint;":"∭","&conint;":"∮","&Conint;":"∯","&Cconint;":"∰","&cwint;":"∱","&cwconint;":"∲","&awconint;":"∳","&there4;":"∴","&because;":"∵","&ratio;":"∶","&Colon;":"∷","&minusd;":"∸","&mDDot;":"∺","&homtht;":"∻","&sim;":"∼","&bsim;":"∽","&ac;":"∾","&acd;":"∿","&wreath;":"≀","&nsim;":"≁","&esim;":"≂","&sime;":"≃","&nsime;":"≄","&cong;":"≅","&simne;":"≆","&ncong;":"≇","&asymp;":"≈","&nap;":"≉","&approxeq;":"≊","&apid;":"≋","&bcong;":"≌","&asympeq;":"≍","&bump;":"≎","&bumpe;":"≏","&esdot;":"≐","&eDot;":"≑","&efDot;":"≒","&erDot;":"≓","&colone;":"≔","&ecolon;":"≕","&ecir;":"≖","&cire;":"≗","&wedgeq;":"≙","&veeeq;":"≚","&trie;":"≜","&equest;":"≟","&equiv;":"≡","&nequiv;":"≢","&le;":"≤","&ge;":"≥","&lE;":"≦","&gE;":"≧","&lnE;":"≨","&gnE;":"≩","&Lt;":"≪","&Gt;":"≫","&between;":"≬","&NotCupCap;":"≭","&nlt;":"≮","&ngt;":"≯","&nle;":"≰","&nge;":"≱","&lsim;":"≲","&gsim;":"≳","&nlsim;":"≴","&ngsim;":"≵","&lg;":"≶","&gl;":"≷","&ntlg;":"≸","&ntgl;":"≹","&pr;":"≺","&sc;":"≻","&prcue;":"≼","&sccue;":"≽","&prsim;":"≾","&scsim;":"≿","&npr;":"⊀","&nsc;":"⊁","&sub;":"⊂","&sup;":"⊃","&nsub;":"⊄","&nsup;":"⊅","&sube;":"⊆","&supe;":"⊇","&nsube;":"⊈","&nsupe;":"⊉","&subne;":"⊊","&supne;":"⊋","&cupdot;":"⊍","&uplus;":"⊎","&sqsub;":"⊏","&sqsup;":"⊐","&sqsube;":"⊑","&sqsupe;":"⊒","&sqcap;":"⊓","&sqcup;":"⊔","&oplus;":"⊕","&ominus;":"⊖","&otimes;":"⊗","&osol;":"⊘","&odot;":"⊙","&ocir;":"⊚","&oast;":"⊛","&odash;":"⊝","&plusb;":"⊞","&minusb;":"⊟","&timesb;":"⊠","&sdotb;":"⊡","&vdash;":"⊢","&dashv;":"⊣","&top;":"⊤","&perp;":"⊥","&models;":"⊧","&vDash;":"⊨","&Vdash;":"⊩","&Vvdash;":"⊪","&VDash;":"⊫","&nvdash;":"⊬","&nvDash;":"⊭","&nVdash;":"⊮","&nVDash;":"⊯","&prurel;":"⊰","&vltri;":"⊲","&vrtri;":"⊳","&ltrie;":"⊴","&rtrie;":"⊵","&origof;":"⊶","&imof;":"⊷","&mumap;":"⊸","&hercon;":"⊹","&intcal;":"⊺","&veebar;":"⊻","&barvee;":"⊽","&angrtvb;":"⊾","&lrtri;":"⊿","&xwedge;":"⋀","&xvee;":"⋁","&xcap;":"⋂","&xcup;":"⋃","&diamond;":"⋄","&sdot;":"⋅","&Star;":"⋆","&divonx;":"⋇","&bowtie;":"⋈","&ltimes;":"⋉","&rtimes;":"⋊","&lthree;":"⋋","&rthree;":"⋌","&bsime;":"⋍","&cuvee;":"⋎","&cuwed;":"⋏","&Sub;":"⋐","&Sup;":"⋑","&Cap;":"⋒","&Cup;":"⋓","&fork;":"⋔","&epar;":"⋕","&ltdot;":"⋖","&gtdot;":"⋗","&Ll;":"⋘","&Gg;":"⋙","&leg;":"⋚","&gel;":"⋛","&cuepr;":"⋞","&cuesc;":"⋟","&nprcue;":"⋠","&nsccue;":"⋡","&nsqsube;":"⋢","&nsqsupe;":"⋣","&lnsim;":"⋦","&gnsim;":"⋧","&prnsim;":"⋨","&scnsim;":"⋩","&nltri;":"⋪","&nrtri;":"⋫","&nltrie;":"⋬","&nrtrie;":"⋭","&vellip;":"⋮","&ctdot;":"⋯","&utdot;":"⋰","&dtdot;":"⋱","&disin;":"⋲","&isinsv;":"⋳","&isins;":"⋴","&isindot;":"⋵","&notinvc;":"⋶","&notinvb;":"⋷","&isinE;":"⋹","&nisd;":"⋺","&xnis;":"⋻","&nis;":"⋼","&notnivc;":"⋽","&notnivb;":"⋾","&frac14;":"¼","&frac12;":"½","&frac34;":"¾","&frac13;":"⅓","&frac23;":"⅔","&frac15;":"⅕","&frac25;":"⅖","&frac35;":"⅗","&frac45;":"⅘","&frac16;":"⅙","&frac56;":"⅚","&frac18;":"⅛","&frac38;":"⅜","&frac58;":"⅝","&frac78;":"⅞","&excl;":"!","&quot;":"\"","&num;":"#","&amp;":"&","&apos;":"'","&lpar;":"(","&rpar;":")","&ast;":"*","&comma;":",","&period;":".","&sol;":"/","&colon;":":","&semi;":";","&quest;":"?","&commat;":"@","&lbrack;":"[","&bsol;":"\\","&rbrack;":"]","&Hat;":"^","&lowbar;":"_","&grave;":"`","&lbrace;":"{","&vert;":"|","&rbrace;":"}","&tilde;":"~","&nbsp;":"","&iexcl;":"¡","&brvbar;":"¦","&sect;":"§","&uml;":"¨","&copy;":"©","&ordf;":"ª","&laquo;":"«","&shy;":"­","&reg;":"®","&macr;":"¯","&acute;":"´","&micro;":"µ","&para;":"¶","&middot;":"·","&cedil;":"¸","&ordm;":"º","&raquo;":"»","&iquest;":"¿","&hyphen;":"‐","&ndash;":"–","&mdash;":"—","&horbar;":"―","&Vert;":"‖","&lsquo;":"‘","&rsquo;":"’","&sbquo;":"‚","&ldquo;":"“","&rdquo;":"”","&bdquo;":"„","&dagger;":"†","&Dagger;":"‡","&bull;":"•","&nldr;":"‥","&hellip;":"…","&prime;":"′","&Prime;":"″","&tprime;":"‴","&bprime;":"‵","&lsaquo;":"‹","&rsaquo;":"›","&oline;":"‾","&caret;":"⁁","&hybull;":"⁃","&frasl;":"⁄","&bsemi;":"⁏","&qprime;":"⁗","&trade;":"™","&Copf;":"ℂ","&incare;":"℅","&gscr;":"ℊ","&hamilt;":"ℋ","&Hfr;":"ℌ","&Hopf;":"ℍ","&planckh;":"ℎ","&planck;":"ℏ","&Iscr;":"ℐ","&image;":"ℑ","&Lscr;":"ℒ","&ell;":"ℓ","&Nopf;":"ℕ","&numero;":"№","&copysr;":"℗","&weierp;":"℘","&Popf;":"ℙ","&Qopf;":"ℚ","&Rscr;":"ℛ","&real;":"ℜ","&Ropf;":"ℝ","&rx;":"℞","&Zopf;":"ℤ","&mho;":"℧","&Zfr;":"ℨ","&iiota;":"℩","&bernou;":"ℬ","&Cfr;":"ℭ","&escr;":"ℯ","&Escr;":"ℰ","&Fscr;":"ℱ","&Mscr;":"ℳ","&oscr;":"ℴ","&alefsym;":"ℵ","&beth;":"ℶ","&gimel;":"ℷ","&daleth;":"ℸ","&DD;":"ⅅ","&dd;":"ⅆ","&ee;":"ⅇ","&ii;":"ⅈ","&starf;":"★","&star;":"☆","&phone;":"☎","&female;":"♀","&male;":"♂","&spades;":"♠","&clubs;":"♣","&hearts;":"♥","&diams;":"♦","&sung;":"♪","&flat;":"♭","&natural;":"♮","&sharp;":"♯","&check;":"✓","&cross;":"✗","&malt;":"✠","&sext;":"✶","&VerticalSeparator;":"❘","&lbbrk;":"❲","&rbbrk;":"❳"}
const unicode_chars = {"\\u003d": "=", "\\u0026": "&"}

function unHTMLString (str) {
    return str.replace(/\\u[\da-z]{4}/g, substr => unicode_chars[substr]).replace(/&\w+;/g, substr => html_escape_entities[substr]);
}

commands.set('photo', new Command({description: 'Найти картинку по тексту', format: '[текст запроса]', action: async (args, command_message) => {


    const query_string = command_message.content.substring(args[0].length + 1 + args[1].length).trim();
    if (query_string == '') {
        await command_message.reply('Чего то не хватает, тебе не кажется?))');
        return;
    }

    const nsfw = (command_message.channel as TextChannel).nsfw;
    googlethis.image(query_string, {safe: !nsfw}).then(async reply => {
        if (reply.length > 0) {
            let choice_id = oneOfIndex(reply);
            const choice_id_initial = choice_id;
            while (!reply[choice_id].url.startsWith('http:') && !reply[choice_id].url.startsWith('https:')) {
                choice_id = (choice_id + 1) % reply.length;
                if (choice_id == choice_id_initial) {
                    await command_message.reply('Я ничего не нашла >.<');
                    return;
                }
            }

            const embed = new MessageEmbed()
                .setTitle(unHTMLString(reply[choice_id].origin.title))
                .setURL(unHTMLString(reply[choice_id].origin.source))
                .setColor(config.main_color as HexColorString)
                .setImage(unHTMLString(reply[choice_id].url));
            await command_message.reply({content: config.sign, embeds: [embed]})
            //const choice = oneOf(reply)
            //await command_message.reply({content: `${unHTMLString(choice.origin.title)}\n<${unHTMLString(choice.origin.source)}>`, files: [unHTMLString(choice.url)], embeds: []})
        } else {
            await command_message.reply('Я ничего не нашла >.<')
        }
        })
    }}));

export default class App {
    static instance: App = null;

    client: Client;
    gateway: DiscordGateway;
    //mute_list: Map<string, Muted> = new Map<string, Muted>();

    constructor() {
        if (App.instance != null) throw new Error('Only one App instance may exist!');

        App.instance = this;

        //{
        //    const cached_muted: Array<MutedCache> = Cache.getValue('muted', []);
        //    cached_muted.forEach(muted => {
        //        const end_time = new Date(muted.end_time);
        //        this.mute_list[muted.id] = {
        //            tag: muted.tag,
        //            id: muted.id,
        //            guild_id: muted.guild_id,
        //            job: startUnmuteJob(muted.id, muted.guild_id, end_time),
        //            end_time: end_time
        //        }
        //    });
        //}

        this.client = new Client({
            intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS]
        })

        this.gateway = new DiscordGateway();

        this.gateway.on('MESSAGE_REACTION_ADD', async (d) => {
            if (d.message_id === config.furry_message) {
                const member = App.instance.client.guilds.cache.get(d.guild_id).members.cache.get(d.user_id);
                if (member.id != member.guild.me.id) {
                    await App.instance.addFurry(member, d.emoji.name);
                }
            }
        });

        this.gateway.on('MESSAGE_REACTION_REMOVE', async (d) => {
            if (d.message_id === config.furry_message) {
                const member = App.instance.client.guilds.cache.get(d.guild_id).members.cache.get(d.user_id)
                if (member != undefined && member.id != member.guild.me.id) {
                    await App.instance.removeFurry(member, d.emoji.name);
                }
            }
        });

        this.gateway.on('MESSAGE_CREATE', async (d) => {
            if (d.content.startsWith(`<@${App.instance.client.user.id}>`) || d.content.startsWith('<@&974826587876892725>')) {
                const guild = App.instance.client.guilds.cache.get(d.guild_id);
                (guild.channels.cache.get(d.channel_id) as TextBasedChannel).messages.fetch(d.id).then(message => {
                    Talk.handle(message)
                });
            } else {
                let args: Array<string> = d.content.split(' ').filter(arg => arg);
                if (args[0] == '!dragon') {
                    const sub_command = args[1];
                    const guild = App.instance.client.guilds.cache.get(d.guild_id);

                    (guild.channels.cache.get(d.channel_id) as TextBasedChannel).messages.fetch(d.id).then(command_message => {
                        if (sub_command == undefined) {
                            command_message.reply(oneOf(['че?', 'м?', 'а?', 'угу', 'ага', 'ну?', 'да?', 'хм', 'чево ты желаешь?']));
                        } else {
                            if (sub_command == 'commands') {
                                const show_hidden = (args[2] || '').toLowerCase() == 'all';
                                const embed = new MessageEmbed()
                                    .setColor(config.main_color as HexColorString)
                                    .setTitle(show_hidden ? 'Вот все что я могу' : 'Вот что я могу')
                                    .addField('!dragon commands (all)', 'Узнать что я могу')

                                commands.forEach((value, key) => {
                                    if (show_hidden ? true : !value.hidden) {
                                        let field = value.description;
                                        if (value.roles.length > 0) field += '\nТолько для ' + value.roles.map(role => `<@&${role}>`).join(', ')
                                        embed.addField(`!dragon ${key} ${value.format}`, field);
                                    }
                                })

                                command_message.reply({content: config.sign, embeds: [embed]})
                            } else {
                                const command = commands.get(sub_command);
                                if (command != undefined) {
                                    let pass_protection = true;
                                    if (command.roles.length > 0) {
                                        const user_roles = guild.members.cache.get(command_message.author.id).roles.cache;
                                        pass_protection = user_roles.some(role => command.roles.includes(role.id));
                                    }

                                    if (pass_protection) {
                                        try {
                                            command.action(args, command_message);
                                        } catch (err) {
                                            console.log('!!!error!!!')
                                            console.error(err)
                                        }
                                    } else {
                                        command_message.reply(oneOf(['Прав не хватает', 'Не хватает прав', 'Тебе не хватает прав', 'Ну куда ты лезешь, а?']))
                                    }
                                }
                            }
                        }
                    })
                }
            }
        })
    }

    run () {
        return new Promise((resolve: Function, reject: (reason: any) => void) => {
            this.client.once('ready', () => {
                console.log('Client ready!');
                resolve();
            })

            this.client.login(config.token).then(() => {
                this.gateway.reconnect();
            }, reject);
        })
    }

    async addFurry (member: GuildMember, emoji_name: string) {
        Database.connection.all('SELECT id, name, emoji from furries WHERE emoji = ?', emoji_name, async (err, rows) => {
            const furry = rows[0];
            if (furry != undefined) {
                const role = member.guild.roles.cache.find(role => role.name === furry.name);
                if (role != undefined) {
                    await member.roles.add(role.id)
                }
            }
        })
    }

    async removeFurry (member: GuildMember, emoji_name: string) {
        Database.connection.all('SELECT id, name, emoji from furries WHERE emoji = ?', emoji_name, async (err, rows) => {
            const furry = rows[0];
            if (furry != undefined) {
                const role = member.guild.roles.cache.find(role => role.name === furry.name);
                if (role != undefined) {
                    await member.roles.remove(role.id)
                }
            }
        })
    }
}