const process = globalThis.process?.env ? globalThis.process : { env: {} };
let os = { networkInterfaces: () => ({}) };
try { if (typeof require === 'function') os = require('node:os'); } catch { /* sandboxed host */ }


const isIPv4 = (item) => {
    if (!item) return false;
    const family = typeof item.family === 'string' ? item.family : String(item.family || '');
    return family === 'IPv4' || family === '4';
};

const isValidIPv4 = (ip) => {
    const text = String(ip || '').trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(text)) return false;
    return text.split('.').every((part) => {
        const value = Number(part);
        return Number.isInteger(value) && value >= 0 && value <= 255;
    });
};

const isPrivateIPv4 = (ip) =>
    /^192\.168\./.test(ip) || /^10\./.test(ip) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);

const isCgnatIPv4 = (ip) => /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip);

const isReservedOrUnroutableIPv4 = (ip) => {
    const text = String(ip || '').trim();
    return (
        /^0\./.test(text) ||
        /^127\./.test(text) ||
        /^169\.254\./.test(text) ||
        /^192\.0\.0\./.test(text) ||
        /^192\.0\.2\./.test(text) ||
        /^198\.18\./.test(text) ||
        /^198\.19\./.test(text) ||
        /^198\.51\.100\./.test(text) ||
        /^203\.0\.113\./.test(text) ||
        /^22[4-9]\./.test(text) ||
        /^23\d\./.test(text) ||
        /^24\d\./.test(text) ||
        /^25[0-5]\./.test(text)
    );
};

const isLikelyCellularInterface = (name = '') => /(rmnet|ccmni|pdp|wwan|cell|mobile|clat|v4-rmnet)/i.test(name);
const isLikelyLanInterface = (name = '') => /(wlan|wi-?fi|eth|en\d|lan|bridge)/i.test(String(name || ''));
const isLikelyVirtualOrTunnelInterface = (name = '') =>
    /(virtual|veth|vethernet|vmware|vbox|hyper-v|docker|podman|br-|wsl|utun|tun|tap|tailscale|zerotier|wireguard|wg|clash|mihomo|loopback|pseudo)/i.test(
        String(name || '')
    );

const calcCandidateScore = (candidate) => {
    let score = 0;
    if (/^192\.168\./.test(candidate.ip)) score += 300;
    else if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(candidate.ip)) score += 260;
    else if (/^10\./.test(candidate.ip)) score += 220;
    else if (!isCgnatIPv4(candidate.ip)) score += 180;
    if (isLikelyLanInterface(candidate.name)) score += 80;
    if (isLikelyCellularInterface(candidate.name)) score -= 320;
    if (isLikelyVirtualOrTunnelInterface(candidate.name)) score -= 260;
    if (isCgnatIPv4(candidate.ip)) score -= 220;
    return score;
};

function getIPAddress() {
    const forcedIp = String(process.env.CATPAW_HOST_IP || process.env.HOST_IP || '').trim();
    if (isValidIPv4(forcedIp)) return forcedIp;

    const interfaces = os.networkInterfaces() || {};
    const candidates = [];
    Object.entries(interfaces).forEach(([name, items]) => {
        if (!Array.isArray(items)) return;
        items.forEach((item) => {
            if (!isIPv4(item) || item.internal) return;
            const ip = String(item.address || '').trim();
            if (!ip || ip.startsWith('169.254.') || isReservedOrUnroutableIPv4(ip)) return;
            candidates.push({ ip, name: String(name || '') });
        });
    });

    const ranked = candidates
        .map((candidate) => ({ ...candidate, score: calcCandidateScore(candidate) }))
        .sort((a, b) => b.score - a.score);

    const preferred = ranked.find((candidate) => {
        return (
            !isLikelyCellularInterface(candidate.name) &&
            !isLikelyVirtualOrTunnelInterface(candidate.name) &&
            !isCgnatIPv4(candidate.ip)
        );
    });
    if (preferred) return preferred.ip;

    const fallbackPrivate = ranked.find(
        (candidate) =>
            isPrivateIPv4(candidate.ip) &&
            !isLikelyCellularInterface(candidate.name) &&
            !isLikelyVirtualOrTunnelInterface(candidate.name)
    );
    if (fallbackPrivate) return fallbackPrivate.ip;

    return '127.0.0.1';
}



const builtinDanmuAddress = `http://${getIPAddress()}:9321`;

// 采集源写入 cms.list；douer 原样为每条注册一个「采」入口（不再聚合 cmshub）。
const cmsSources = [];

module.exports.default = {
    lee: {
        localRoot: process.env.CATPAW_LOCAL_ROOT || '',
        guangyaSite: { cookie: process.env.CATPAW_GUANGYA_COOKIE || '', userAgent: process.env.CATPAW_GUANGYA_UA || '' },
        kfForum: { urls: ['https://www.kfzy.net'], cookie: process.env.CATPAW_KF_COOKIE || '' },
        pan123Forum: { urls: ['https://123panfx.com', 'https://pan1.me'], cookie: process.env.CATPAW_123_FORUM_COOKIE || '' },
        misou: { urls: ['http://gesoso.fun', 'http://www.misoso.shop'] },
        kuaiying: { urls: ['http://xsayang.fun', 'http://38.76.197.172:12521'] },
        seedhub: { urls: ['https://sidhub.cc', 'https://seeduck.cc', 'https://hubdog.cc', 'http://104.243.25.80'] },
        marketUrl: '',
    },
    ali: {
        token: '',
        prefix: '阿里',
    },
    quark: {
        cookie: '',
    },
    uc: {
        cookie: '',
        token: '',
        ut: '',
    },
    y115: {
        cookie: '',
        offline: {
            savePath: '0',
            pollAttempts: 6,
            pollIntervalMs: 1500,
        },
    },
    baidu: {
        cookie: '',
    },
    tianyi: {
        username: '',
        password: '',
    },
    pan123: {
        username: '',
        password: '',
    },
    // 网盘站域名表对齐上游 douer / peekpro 包（引擎读 *.urls）
    muou: {
        urls: ['https://123.666291.xyz', 'https://666.666291.xyz', 'https://www.muoua.top', 'https://333.333291.xyz'],
    },
    wanou: {
        urls: ['https://www.wogg.live', 'https://woggpan.888484.xyz'],
    },
    wogg: {
        urls: ['https://www.wogg.live', 'https://woggpan.888484.xyz'],
    },
    leijing: {
        urls: ['https://www.leijing1.com', 'https://leijing1.com', 'https://www.leijing.xyz'],
    },
    duoduo: {
        urls: ['https://tv.yydsys.cc', 'https://tv.214521.xyz'],
    },
    zhizhen: {
        urls: ['https://www.zhizhen8.click', 'https://www.mihdr.top'],
    },
    ouge: {
        urls: ['https://woog.nxog.eu.org', 'https://woog.430520.xyz'],
    },
    labi: {
        urls: ['http://tvpanpan.site', 'https://www.mmpanpan.site'],
    },
    huban: {
        urls: ['http://xhban.xyz', 'http://38.76.197.172:16969'],
    },
    erxiao: {
        urls: ['https://www.2xiaopan.one'],
    },
    shandian: {
        urls: ['http://shandian.blog'],
    },
    tgsou: {
        tgPic: true,
        count: 0,
        url: 'https://tgsou.lmentor.dpdns.org',
        channelUsername:
            'tgsearchers7,Aliyun_4K_Movies,Quark_Movies,shareAliyun,ydypzyfx,ucquark,xx123pan,Yingshifenxiang123',
    },
    pansou: {
        url: 'https://so.hk.111651.xyz',
        channels: '',
        plugins: '',
        cloudTypes: '',
    },
    tgchannel: {
        url: 'https://t.me',
        count: 4,
        enableImage: true,
        homeChannelUsername: ['tgsearchers7', 'douerpan'],
        channelUsername: [
            'Q66Share',
            'alyp_TV',
            'ucquark',
            'tianyirigeng',
            'Quark_Movies',
            'shareAliyun',
            'xx123pan',
        ],
        channelRemark: {
            tgsearchers7: '资源宇宙',
            douerpan: '豆儿盘',
        },
    },
    tgfilebot: {
        url: 'http://127.0.0.1:8080',
        password: '',
    },
    sites: {
        list: [],
    },
    pans: {
        list: [],
    },
    danmu: {
        urls: [{ address: builtinDanmuAddress, name: '内置弹幕', builtin: true }],
        format: 'xml',
        autoPush: true,
        debug: false,
    },
    t4: {
        list: [],
    },
    cms: {
        list: cmsSources,
    },
    // 本地 JS spider：引擎支持 createSpider；默认关闭远程 urls，可按 docs 上传到 dir
    customSpiders: {
        enabled: false,
        dir: '',
        urls: [],
        strict: false,
        allowOverride: false,
        cacheTtlMs: 5000,
        factoryTimeoutMs: 10000,
        urlTimeoutMs: 10000,
    },
    bilibili: {
        cookie: '',
        classes: '',
    },
    live2vod: {
        sources: [
            { name: 'IPTV', url: 'https://iptv-org.github.io/iptv/countries/cn.m3u', img: '' },
            {
                name: '范明明',
                url: 'https://cdn.jsdelivr.net/gh/fanmingming/live@refs/heads/main/tv/m3u/ipv6.m3u',
                img: '',
            },
            { name: '电视', url: 'https://cdn.jsdelivr.net/gh/YueChan/Live@refs/heads/main/GNTV.m3u', img: '' },
            { name: '网络', url: 'https://cdn.jsdelivr.net/gh/fanmingming/live@refs/heads/main/tv/m3u/itv.m3u', img: '' },
            { name: '体育', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u', img: '' },
            { name: '哔哩', url: 'https://sub.ottiptv.cc/bililive.m3u', img: '' },
            { name: '虎牙', url: 'https://sub.ottiptv.cc/huyayqk.m3u', img: '' },
            { name: '斗鱼', url: 'https://sub.ottiptv.cc/douyuyqk.m3u', img: '' },
            { name: 'YY', url: 'https://sub.ottiptv.cc/yylunbo.m3u', img: '' },
        ],
        showMode: 'groups',
        def_pic: 'https://ghproxy.net/https://raw.githubusercontent.com/hjdhnx/hipy-server/master/app/static/img/lives.jpg',
    },
    alist: [
        { name: '🐉神族九帝', server: 'https://alist.shenzjd.com' },
        { name: '💢repl', server: 'https://ali.liucn.repl.co' },
    ],
    color: [
        {
            light: {
                bg: 'https://i2.100024.xyz/2024/01/13/pptcej.webp',
                bgMask: '0x50ffffff',
                primary: '0xff446732',
                onPrimary: '0xffffffff',
                primaryContainer: '0xffc5efab',
                onPrimaryContainer: '0xff072100',
                secondary: '0xff55624c',
                onSecondary: '0xffffffff',
                secondaryContainer: '0xffd9e7cb',
                onSecondaryContainer: '0xff131f0d',
                tertiary: '0xff386666',
                onTertiary: '0xffffffff',
                tertiaryContainer: '0xffbbebec',
                onTertiaryContainer: '0xff002020',
                error: '0xffba1a1a',
                onError: '0xffffffff',
                errorContainer: '0xffffdad6',
                onErrorContainer: '0xff410002',
                background: '0xfff8faf0',
                onBackground: '0xff191d16',
                surface: '0xfff8faf0',
                onSurface: '0xff191d16',
                surfaceVariant: '0xffe0e4d6',
                onSurfaceVariant: '0xff191d16',
                inverseSurface: '0xff2e312b',
                inverseOnSurface: '0xfff0f2e7',
                outline: '0xff74796d',
                outlineVariant: '0xffc3c8bb',
                shadow: '0xff000000',
                scrim: '0xff000000',
                inversePrimary: '0xffaad291',
                surfaceTint: '0xff446732',
            },
            dark: {
                bg: 'https://i2.100024.xyz/2024/01/13/pptg3z.webp',
                bgMask: '0x50000000',
                primary: '0xffaad291',
                onPrimary: '0xff173807',
                primaryContainer: '0xff2d4f1c',
                onPrimaryContainer: '0xffc5efab',
                secondary: '0xffbdcbb0',
                onSecondary: '0xff283420',
                secondaryContainer: '0xff3e4a35',
                onSecondaryContainer: '0xffd9e7cb',
                tertiary: '0xffa0cfcf',
                onTertiary: '0xff003738',
                tertiaryContainer: '0xff1e4e4e',
                onTertiaryContainer: '0xffbbebec',
                error: '0xffffb4ab',
                onError: '0xff690005',
                errorContainer: '0xff93000a',
                onErrorContainer: '0xffffdad6',
                background: '0xff11140e',
                onBackground: '0xffe1e4d9',
                surface: '0xff11140e',
                onSurface: '0xffe1e4d9',
                surfaceVariant: '0xff43483e',
                onSurfaceVariant: '0xffe1e4d9',
                inverseSurface: '0xffe1e4d9',
                inverseOnSurface: '0xff2e312b',
                outline: '0xff8d9286',
                outlineVariant: '0xff43483e',
                shadow: '0xff000000',
                scrim: '0xff000000',
                inversePrimary: '0xff446732',
                surfaceTint: '0xffaad291',
            },
        },
        {
            light: {
                bg: 'https://i2.100024.xyz/2024/01/13/pi2rpw.webp',
                bgMask: '0x50ffffff',
                primary: '0xff666014',
                onPrimary: '0xffffffff',
                primaryContainer: '0xffeee58c',
                onPrimaryContainer: '0xff1f1c00',
                secondary: '0xff625f42',
                onSecondary: '0xffffffff',
                secondaryContainer: '0xffe9e4be',
                onSecondaryContainer: '0xff1e1c05',
                tertiary: '0xff3f6654',
                onTertiary: '0xffffffff',
                tertiaryContainer: '0xffc1ecd5',
                onTertiaryContainer: '0xff002114',
                error: '0xffba1a1a',
                onError: '0xffffffff',
                errorContainer: '0xffffdad6',
                onErrorContainer: '0xff410002',
                background: '0xfffef9eb',
                onBackground: '0xff1d1c14',
                surface: '0xfffef9eb',
                onSurface: '0xff1d1c14',
                surfaceVariant: '0xffe7e3d0',
                onSurfaceVariant: '0xff1d1c14',
                inverseSurface: '0xff323128',
                inverseOnSurface: '0xfff5f1e3',
                outline: '0xff7a7768',
                outlineVariant: '0xffcbc7b5',
                shadow: '0xff000000',
                scrim: '0xff000000',
                inversePrimary: '0xffd1c973',
                surfaceTint: '0xff666014',
            },
            dark: {
                bg: 'https://i2.100024.xyz/2024/01/13/pi2reo.webp',
                bgMask: '0x50000000',
                primary: '0xffd1c973',
                onPrimary: '0xff353100',
                primaryContainer: '0xff4d4800',
                onPrimaryContainer: '0xffeee58c',
                secondary: '0xffcdc8a3',
                onSecondary: '0xff333117',
                secondaryContainer: '0xff4a482c',
                onSecondaryContainer: '0xffe9e4be',
                tertiary: '0xffa6d0b9',
                onTertiary: '0xff0e3727',
                tertiaryContainer: '0xff274e3d',
                onTertiaryContainer: '0xffc1ecd5',
                error: '0xffffb4ab',
                onError: '0xff690005',
                errorContainer: '0xff93000a',
                onErrorContainer: '0xffffdad6',
                background: '0xff14140c',
                onBackground: '0xffe7e2d5',
                surface: '0xff14140c',
                onSurface: '0xffe7e2d5',
                surfaceVariant: '0xff49473a',
                onSurfaceVariant: '0xffe7e2d5',
                inverseSurface: '0xffe7e2d5',
                inverseOnSurface: '0xff323128',
                outline: '0xff949181',
                outlineVariant: '0xff49473a',
                shadow: '0xff000000',
                scrim: '0xff000000',
                inversePrimary: '0xff666014',
                surfaceTint: '0xffd1c973',
            },
        },
        {
            light: {
                bg: 'https://i2.100024.xyz/2024/01/13/qrnuwt.webp',
                bgMask: '0x50ffffff',
                primary: '0xFF2B6C00',
                onPrimary: '0xFFFFFFFF',
                primaryContainer: '0xFFA6F779',
                onPrimaryContainer: '0xFF082100',
                secondary: '0xFF55624C',
                onSecondary: '0xFFFFFFFF',
                secondaryContainer: '0xFFD9E7CA',
                onSecondaryContainer: '0xFF131F0D',
                tertiary: '0xFF386666',
                onTertiary: '0xFFFFFFFF',
                tertiaryContainer: '0xFFBBEBEB',
                onTertiaryContainer: '0xFF002020',
                error: '0xFFBA1A1A',
                onError: '0xFFFFFFFF',
                errorContainer: '0xFFFFDAD6',
                onErrorContainer: '0xFF410002',
                background: '0xFFFDFDF5',
                onBackground: '0xFF1A1C18',
                surface: '0xFFFDFDF5',
                onSurface: '0xFF1A1C18',
                surfaceVariant: '0xFFE0E4D6',
                onSurfaceVariant: '0xFF1A1C18',
                inverseSurface: '0xFF2F312C',
                onInverseSurface: '0xFFF1F1EA',
                outline: '0xFF74796D',
                outlineVariant: '0xFFC3C8BB',
                shadow: '0xFF000000',
                scrim: '0xFF000000',
                inversePrimary: '0xFF8CDA60',
                surfaceTint: '0xFF2B6C00',
            },
            dark: {
                bg: 'https://i2.100024.xyz/2024/01/13/qrc37o.webp',
                bgMask: '0x50000000',
                primary: '0xFF8CDA60',
                onPrimary: '0xFF133800',
                primaryContainer: '0xFF1F5100',
                onPrimaryContainer: '0xFFA6F779',
                secondary: '0xFFBDCBAF',
                onSecondary: '0xFF283420',
                secondaryContainer: '0xFF3E4A35',
                onSecondaryContainer: '0xFFD9E7CA',
                tertiary: '0xFFA0CFCF',
                onTertiary: '0xFF003737',
                tertiaryContainer: '0xFF1E4E4E',
                onTertiaryContainer: '0xFFBBEBEB',
                error: '0xFFFFB4AB',
                errorContainer: '0xFF93000A',
                onError: '0xFF690005',
                onErrorContainer: '0xFFFFDAD6',
                background: '0xFF1A1C18',
                onBackground: '0xFFE3E3DC',
                outline: '0xFF8D9286',
                onInverseSurface: '0xFF1A1C18',
                inverseSurface: '0xFFE3E3DC',
                inversePrimary: '0xFF2B6C00',
                shadow: '0xFF000000',
                surfaceTint: '0xFF8CDA60',
                outlineVariant: '0xFF43483E',
                scrim: '0xFF000000',
                surface: '0xFF1A1C18',
                onSurface: '0xFFC7C7C0',
                surfaceVariant: '0xFF43483E',
                onSurfaceVariant: '0xFFC7C7C0',
            },
        },
    ],
};
// ===== 本地打包台 · 生成区开始（重新构建会覆盖，请勿手改） =====
;(function (C) {
  if (!C || typeof C !== 'object') return;
  C.lee = C.lee || {};
  C.lee.siteManifest = [{"key":"nodejs_douban","name":"「荐」豆瓣","enable":true},{"key":"nodejs_baseset","name":"「设」配置","enable":true},{"key":"nodejs_wanou","name":"「盘」玩偶","enable":true},{"key":"nodejs_muou","name":"「盘」木偶","enable":true},{"key":"nodejs_labi","name":"「盘」蜡笔","enable":false},{"key":"nodejs_shandian","name":"「盘」闪电","enable":true},{"key":"nodejs_zhizhen","name":"「盘」至臻","enable":true},{"key":"nodejs_duoduo","name":"「盘」多多","enable":false},{"key":"nodejs_ouge","name":"「盘」欧歌","enable":true},{"key":"nodejs_erxiao","name":"「盘」二小","enable":true},{"key":"nodejs_huban","name":"「盘」虎斑","enable":true},{"key":"nodejs_xiaoban","name":"「盘」小斑","enable":true},{"key":"nodejs_woniu","name":"「盘」蜗牛","enable":true},{"key":"nodejs_libvio","name":"「盘」立播","enable":true},{"key":"nodejs_4kzn","name":"「盘」指南","enable":true},{"key":"nodejs_pinglian","name":"「盘」盘链","enable":true},{"key":"nodejs_guanying","name":"「盘」观影","enable":true},{"key":"nodejs_bdjuhe","name":"「盘」综合","enable":false},{"key":"nodejs_tgchannel","name":"「盘」TG搜","enable":false},{"key":"nodejs_pansou","name":"「盘」PanSou","enable":false},{"key":"nodejs_123ypzysq","name":"「盘」123社区","enable":false},{"key":"nodejs_cloudseekr","name":"「盘」CLOUDSEEK","enable":false},{"key":"nodejs_fenxiang","name":"「盘」分享","enable":false},{"key":"nodejs_myquark","name":"「盘」夸克","enable":false},{"key":"nodejs_myali","name":"「盘」阿里","enable":false},{"key":"nodejs_mytianyi","name":"「盘」天翼","enable":false},{"key":"nodejs_mybaidu","name":"「盘」百度","enable":false},{"key":"nodejs_myguangyapan","name":"「盘」光鸭","enable":false},{"key":"nodejs_my115","name":"「盘」115","enable":false},{"key":"nodejs_my123","name":"「盘」123","enable":false},{"key":"nodejs_doubi","name":"「直」豆哔","enable":false},{"key":"nodejs_guazi","name":"瓜子APP","enable":true},{"key":"nodejs_jianpian","name":"荐片","enable":true},{"key":"nodejs_xingya","name":"星芽短剧","enable":true},{"key":"nodejs_kafei","name":"咖啡","enable":true},{"key":"nodejs_live2vod","name":"「直」直播","enable":false},{"key":"nodejs_push","name":"推送","enable":false},{"key":"nodejs_alist_alist_default","name":"「直」亿苯正经的Alist库","enable":false},{"key":"nodejs_lee_myuc","name":"UC • 网盘","enable":false},{"key":"nodejs_lee_myxunlei","name":"迅雷 • 云盘","enable":false},{"key":"nodejs_lee_local","name":"本地 • 视频","enable":false},{"key":"nodejs_lee_baiku","name":"百酷 • 搜索","enable":false},{"key":"nodejs_lee_kule","name":"酷乐 • 搜索","enable":false},{"key":"nodejs_lee_guigui","name":"鬼鬼 • 搜索","enable":false},{"key":"nodejs_lee_qupanso","name":"趣盘 • 搜索","enable":false},{"key":"nodejs_lee_misou","name":"米搜 • 搜索","enable":false},{"key":"nodejs_lee_juheso","name":"聚合 • 搜索","enable":false},{"key":"nodejs_lee_jike","name":"即刻 • 4K","enable":true},{"key":"nodejs_lee_aipan","name":"爱盼 • 4K","enable":true},{"key":"nodejs_lee_yidong4k","name":"移动 • 4K","enable":true},{"key":"nodejs_lee_huajuan","name":"花卷 • 4K原盘","enable":true},{"key":"nodejs_lee_guangya_site","name":"光鸭 • 臻影社","enable":true},{"key":"nodejs_lee_kf","name":"夸父 • 4K","enable":true},{"key":"nodejs_lee_123forum","name":"123 • 4K","enable":true},{"key":"nodejs_lee_kuaiying","name":"快映 • 4K","enable":true},{"key":"nodejs_lee_seedhub","name":"种子 • 4K","enable":true},{"key":"nodejs_lee_4kmp","name":"4KMP","enable":true},{"key":"nodejs_lee_fengye4k","name":"枫叶4K","enable":true},{"key":"nodejs_lee_hqvod4k","name":"高清点播4K","enable":true},{"key":"nodejs_lee_juxiafan4k","name":"剧下饭4K","enable":true},{"key":"nodejs_lee_4k_yingshi","name":"4K影视","enable":true},{"key":"nodejs_lee_gulu4k","name":"咕噜咕噜4K","enable":true},{"key":"nodejs_lee_juzi4k","name":"橘汁4K","enable":true},{"key":"nodejs_lee_hetun4k","name":"河豚4K","enable":true},{"key":"nodejs_aikanbot","name":"爱看机器人","enable":true,"api":"/spider/aikanbot/3","type":3,"searchable":1,"quickSearch":1,"filterable":1},{"key":"nodejs_hongguo_node","name":"红果秒播 Node版","enable":true,"api":"/spider/hongguo_node/3","type":3,"searchable":1,"quickSearch":1,"filterable":1},{"key":"nodejs_youtube_video","name":"YouTube・视频","enable":true,"api":"/spider/youtube_video/3","type":3,"searchable":1,"quickSearch":0,"filterable":0},{"key":"nodejs_xingmeng_asmr","name":"星梦ASMR","enable":true,"api":"/spider/xingmeng_asmr/3","type":3,"searchable":1,"quickSearch":1,"filterable":0},{"key":"nodejs_rebo_fast","name":"热播·极速","enable":true,"api":"/spider/rebo_fast/3","type":3,"searchable":1,"quickSearch":1,"filterable":1}];
  C.lee.adultKeys = [];
  C.danmu = C.danmu || {}; C.danmu.autoPush = true;
  C.live2vod = C.live2vod || {}; C.live2vod.sources = [{"name":"范明明","url":"https://cdn.jsdelivr.net/gh/fanmingming/live@refs/heads/main/tv/m3u/ipv6.m3u","img":""},{"name":"电视","url":"https://cdn.jsdelivr.net/gh/YueChan/Live@refs/heads/main/GNTV.m3u","img":""},{"name":"网络","url":"https://cdn.jsdelivr.net/gh/fanmingming/live@refs/heads/main/tv/m3u/itv.m3u","img":""},{"name":"体育","url":"https://iptv-org.github.io/iptv/categories/sports.m3u","img":""},{"name":"哔哩","url":"https://sub.ottiptv.cc/bililive.m3u","img":""},{"name":"虎牙","url":"https://sub.ottiptv.cc/huyayqk.m3u","img":""},{"name":"斗鱼","url":"https://sub.ottiptv.cc/douyuyqk.m3u","img":""},{"name":"YY","url":"https://sub.ottiptv.cc/yylunbo.m3u","img":""}];
  C.alist = [{"name":"🐉神族九帝","server":"https://alist.shenzjd.com"}];
  C.customSpiders = C.customSpiders || {};
  C.customSpiders.enabled = false;
  C.customSpiders.urls = [];
  C.muou = C.muou || {};
  C.muou.urls = ["https://123.666291.xyz","https://666.666291.xyz","https://www.muoua.top","https://333.333291.xyz"];
  C.wanou = C.wanou || {};
  C.wanou.urls = ["https://www.wogg.live","https://woggpan.888484.xyz"];
  C.wogg = C.wogg || {};
  C.wogg.urls = ["https://www.wogg.live","https://woggpan.888484.xyz"];
  C.leijing = C.leijing || {};
  C.leijing.urls = ["https://www.leijing1.com","https://leijing1.com","https://www.leijing.xyz"];
  C.duoduo = C.duoduo || {};
  C.duoduo.urls = ["https://tv.yydsys.cc","https://tv.214521.xyz"];
  C.zhizhen = C.zhizhen || {};
  C.zhizhen.urls = ["https://www.zhizhen8.click","https://www.mihdr.top"];
  C.ouge = C.ouge || {};
  C.ouge.urls = ["https://woog.nxog.eu.org","https://woog.430520.xyz"];
  C.labi = C.labi || {};
  C.labi.urls = ["http://tvpanpan.site","https://www.mmpanpan.site"];
  C.huban = C.huban || {};
  C.huban.urls = ["http://xhban.xyz","http://38.76.197.172:16969"];
  C.erxiao = C.erxiao || {};
  C.erxiao.urls = ["https://www.2xiaopan.one"];
  C.shandian = C.shandian || {};
  C.shandian.urls = ["http://shandian.blog"];
  C.lee = C.lee || {};
  C.lee.kfForum = C.lee.kfForum || {};
  C.lee.kfForum.urls = ["https://www.kfzy.net"];
  C.lee = C.lee || {};
  C.lee.pan123Forum = C.lee.pan123Forum || {};
  C.lee.pan123Forum.urls = ["https://123panfx.com","https://pan1.me"];
  C.lee = C.lee || {};
  C.lee.misou = C.lee.misou || {};
  C.lee.misou.urls = ["http://gesoso.fun","http://www.misoso.shop"];
  C.lee = C.lee || {};
  C.lee.kuaiying = C.lee.kuaiying || {};
  C.lee.kuaiying.urls = ["http://xsayang.fun","http://38.76.197.172:12521"];
  C.lee = C.lee || {};
  C.lee.seedhub = C.lee.seedhub || {};
  C.lee.seedhub.urls = ["https://sidhub.cc","https://seeduck.cc","https://hubdog.cc","http://104.243.25.80"];
  C.tgsou = C.tgsou || {};
  C.tgsou.url = "https://tgsou.lmentor.dpdns.org";
  C.pansou = C.pansou || {};
  C.pansou.url = "https://so.hk.111651.xyz";
  C.tgfilebot = C.tgfilebot || {};
  C.tgfilebot.url = "http://127.0.0.1:8080";
  C.uc = C.uc || {}; C.uc.cookie = "";
  C.quark = C.quark || {}; C.quark.cookie = "";
  C.y115 = C.y115 || {}; C.y115.cookie = "";
  C.baidu = C.baidu || {}; C.baidu.cookie = "";
  C.tianyi = C.tianyi || {}; C.tianyi.username = ""; C.tianyi.password = "";
  C.pan123 = C.pan123 || {}; C.pan123.username = ""; C.pan123.password = "";
  C.ali = C.ali || {}; C.ali.token = "";
})(typeof module !== 'undefined' && module.exports ? module.exports.default || module.exports : (typeof globalThis !== 'undefined' ? globalThis.index_config : null));
// ===== 本地打包台 · 生成区结束 =====
