// 紫微排盤引擎輸出的是簡體字：這裡轉成正體，並補英文／印尼文顯示名稱。只影響畫面文字，不影響排盤計算。
const ZW_S2T = {};
(function(){
  // [簡體, 正體, English, Indonesia]；正體已在 readings-i18n.js 有翻譯的，英／印尼留空沿用原翻譯
  const STARS = [
    ['紫微','紫微'],['天机','天機'],['太阳','太陽'],['武曲','武曲'],['天同','天同'],['廉贞','廉貞'],['天府','天府'],
    ['太阴','太陰'],['贪狼','貪狼'],['巨门','巨門'],['天相','天相'],['天梁','天梁'],['七杀','七殺'],['破军','破軍'],
    ['文昌','文昌'],['文曲','文曲'],['左辅','左輔'],['右弼','右弼'],
    ['天魁','天魁','Tiankui'],['天钺','天鉞','Tianyue'],['禄存','祿存','Lucun'],['天马','天馬','Tianma'],
    ['擎羊','擎羊','Qingyang'],['陀罗','陀羅','Tuoluo'],['火星','火星','Huoxing'],['铃星','鈴星','Lingxing'],
    ['地空','地空','Dikong'],['地劫','地劫','Dijie'],
    ['天官','天官','Tianguan'],['天福','天福','Tiānfú'],['天厨','天廚','Tianchu'],['天刑','天刑','Tianxing'],
    ['天姚','天姚','Tianyao'],['解神','解神','Jieshen'],['天巫','天巫','Tianwu'],['天月','天月','Tiānyuè'],
    ['阴煞','陰煞','Yinsha'],['台辅','台輔','Taifu'],['封诰','封誥','Fenggao'],['天空','天空','Tiankong'],
    ['天哭','天哭','Tianku'],['天虚','天虛','Tianxu'],['龙池','龍池','Longchi'],['凤阁','鳳閣','Fengge'],
    ['红鸾','紅鸞','Hongluan'],['天喜','天喜','Tianxi'],['孤辰','孤辰','Guchen'],['寡宿','寡宿','Guasu'],
    ['蜚廉','蜚廉','Feilian'],['破碎','破碎','Posui'],['华盖','華蓋','Huagai'],['咸池','咸池','Xianchi'],
    ['天德','天德','Tiande'],['月德','月德','Yuede'],['天才','天才','Tiancai'],['天寿','天壽','Tianshou'],
    ['三台','三台','Santai'],['八座','八座','Bazuo'],['恩光','恩光','Enguang'],['天贵','天貴','Tiangui'],
    ['天伤','天傷','Tianshang'],['天使','天使','Tianshi'],['旬空','旬空','Xunkong'],['截路','截路','Jielu'],
    ['空亡','空亡','Kongwang'],['年解','年解','Nianjie'],['劫煞','劫煞','Jiesha'],['龙德','龍德','Longde'],
    ['大耗','大耗','Dahao'],['副旬','副旬','Fuxun'],['截空','截空','Jiekong'],['副截','副截','Fujie'],
  ];
  const OTHER = [
    // 宮名
    ['命宫','命宮'],['兄弟','兄弟'],['夫妻','夫妻'],['子女','子女'],['财帛','財帛'],['疾厄','疾厄'],
    ['迁移','遷移'],['仆役','僕役','Friends','Teman'],['交友','交友'],['官禄','官祿'],['田宅','田宅'],['福德','福德'],['父母','父母'],
    // 亮度
    ['庙','廟','Peak','Puncak'],['旺','旺','Strong','Kuat'],['得','得','Good','Baik'],['利','利','Fair','Cukup'],
    ['平','平','Neutral','Netral'],['不','不','Weak','Lemah'],['闲','閑','Idle','Diam'],['陷','陷','Fallen','Jatuh'],
    ['地','地','Settled','Mapan'],
    // 四化、五行局
    ['禄','祿'],['权','權'],['科','科'],['忌','忌'],
    ['水二局','水二局'],['木三局','木三局'],['金四局','金四局'],['土五局','土五局'],['火六局','火六局'],
    // 陰陽男女
    ['阳男','陽男','Yang male','Pria Yang'],['阴男','陰男','Yin male','Pria Yin'],
    ['阳女','陽女','Yang female','Wanita Yang'],['阴女','陰女','Yin female','Wanita Yin'],
    // 格局
    ['三奇加会','三奇加會','Three Gifts Converge','Tiga Anugerah Bertemu'],
    ['化权入官','化權入官','Authority in Career','Wewenang di Karier'],
    ['化禄入财','化祿入財','Prosperity in Wealth','Rezeki di Harta'],
    ['双禄朝垣','雙祿朝垣','Double Prosperity Facing Life','Rezeki Ganda Menghadap Diri'],
    ['君臣庆会','君臣慶會','Ruler and Ministers Meet','Raja dan Menteri Bertemu'],
    ['天同天梁格','天同天梁格','Tiantong–Tianliang Pattern','Pola Tiantong–Tianliang'],
    ['巨日同宫','巨日同宮','Jumen and Taiyang Together','Jumen dan Taiyang Bersama'],
    ['巨火羊','巨火羊','Jumen with Huoxing and Qingyang','Jumen dengan Huoxing dan Qingyang'],
    ['府相朝垣','府相朝垣','Tianfu and Tianxiang Facing Life','Tianfu dan Tianxiang Menghadap Diri'],
    ['廉杀羊','廉殺羊','Lianzhen, Qisha and Qingyang','Lianzhen, Qisha dan Qingyang'],
    ['廉贞天相格','廉貞天相格','Lianzhen–Tianxiang Pattern','Pola Lianzhen–Tianxiang'],
    ['日月同宫','日月同宮','Sun and Moon Together','Matahari dan Bulan Bersama'],
    ['日月夹命','日月夾命','Sun and Moon Flank Life','Matahari dan Bulan Mengapit Diri'],
    ['昌曲夹命','昌曲夾命','Wenchang and Wenqu Flank Life','Wenchang dan Wenqu Mengapit Diri'],
    ['明珠出海','明珠出海','Pearl Rising from the Sea','Mutiara Muncul dari Laut'],
    ['机月同梁','機月同梁','Ji–Yue–Tong–Liang','Ji–Yue–Tong–Liang'],
    ['机月同梁三星会','機月同梁三星會','Ji–Yue–Tong–Liang (three stars)','Ji–Yue–Tong–Liang (tiga bintang)'],
    ['杀破狼','殺破狼','Sha–Po–Lang','Sha–Po–Lang'],
    ['武曲七杀','武曲七殺','Wuqu and Qisha','Wuqu dan Qisha'],
    ['武贪格','武貪格','Wuqu–Tanlang Pattern','Pola Wuqu–Tanlang'],
    ['火铃夹命','火鈴夾命','Huoxing and Lingxing Flank Life','Huoxing dan Lingxing Mengapit Diri'],
    ['石中隐玉','石中隱玉','Jade Hidden in Stone','Giok Tersembunyi dalam Batu'],
    ['科权双会','科權雙會','Recognition and Authority Meet','Pengakuan dan Wewenang Bertemu'],
    ['空劫夹命','空劫夾命','Dikong and Dijie Flank Life','Dikong dan Dijie Mengapit Diri'],
    ['紫府同宫','紫府同宮','Ziwei and Tianfu Together','Ziwei dan Tianfu Bersama'],
    ['紫微入命','紫微入命','Ziwei in Life','Ziwei di Diri'],
    ['羊陀夹忌','羊陀夾忌','Qingyang and Tuoluo Flank Challenge','Qingyang dan Tuoluo Mengapit Tantangan'],
    ['辅弼同会','輔弼同會','Zuofu and Youbi Meet','Zuofu dan Youbi Bertemu'],
    ['辅弼夹命','輔弼夾命','Zuofu and Youbi Flank Life','Zuofu dan Youbi Mengapit Diri'],
    ['铃昌陀武','鈴昌陀武','Ling–Chang–Tuo–Wu','Ling–Chang–Tuo–Wu'],
    ['阳梁昌禄','陽梁昌祿','Yang–Liang–Chang–Lu','Yang–Liang–Chang–Lu'],
    ['马头带箭','馬頭帶箭','Horse Carrying Arrows','Kuda Membawa Panah'],
    ['魁钺同会','魁鉞同會','Tiankui and Tianyue Meet','Tiankui dan Tianyue Bertemu'],
    ['魁钺夹命','魁鉞夾命','Tiankui and Tianyue Flank Life','Tiankui dan Tianyue Mengapit Diri'],
    ['火贪格','火貪格','Huoxing–Tanlang Pattern','Pola Huoxing–Tanlang'],
    ['铃贪格','鈴貪格','Lingxing–Tanlang Pattern','Pola Lingxing–Tanlang'],
    ['禄存守命','祿存守命','Lucun Guards Life','Lucun Menjaga Diri'],
    ['禄存守身','祿存守身','Lucun Guards Body','Lucun Menjaga Tubuh'],
    ['天马入命','天馬入命','Tianma in Life','Tianma di Diri'],
    ['天马在迁','天馬在遷','Tianma in Travel','Tianma di Pindah'],
    ['化科入命','化科入命','Recognition in Life','Pengakuan di Diri'],
    ['化科入身','化科入身','Recognition in Body','Pengakuan di Tubuh'],
    ['昌曲坐命','昌曲坐命','Wenchang and Wenqu in Life','Wenchang dan Wenqu di Diri'],
    ['昌曲同会','昌曲同會','Wenchang and Wenqu Meet','Wenchang dan Wenqu Bertemu'],
  ];
  const en = LOCAL_READING_TRANSLATIONS.en, id = LOCAL_READING_TRANSLATIONS.id;
  const add = ([simp, trad, enText, idText = enText]) => {
    ZW_S2T[simp] = trad;
    if (enText && !(trad in en)) en[trad] = enText;
    if (idText && !(trad in id)) id[trad] = idText;
  };
  STARS.forEach(add);
  OTHER.forEach(add);
  // 動態格局名：「某星化祿入命」「某星化忌入命／入遷」
  STARS.forEach(([simp, trad]) => {
    const enStar = en[trad], idStar = id[trad];
    add([simp+'化禄入命', trad+'化祿入命', enStar+' Prosperity in Life', 'Rezeki '+idStar+' di Diri']);
    add([simp+'化忌入命', trad+'化忌入命', enStar+' Challenge in Life', 'Tantangan '+idStar+' di Diri']);
    add([simp+'化忌入迁', trad+'化忌入遷', enStar+' Challenge in Travel', 'Tantangan '+idStar+' di Pindah']);
  });
})();
