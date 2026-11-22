// Cada paleta controla a interface inteira. Ordem: fundo, card, navegação,
// ação, cor complementar e terceiro acento. O texto é calculado por contraste.
const seasonal = [
  ['2026-12', 'Colmeia de Natal', 'dark', 'winter', '#260e13','#401d25','#144332','#ff7d86','#70d9a4','#fff8ea'],
  ['2027-01', 'Verão Tropical', 'light', 'waves', '#eaf9f8','#ffffff','#093f50','#047482','#dc634a','#f6cd5c'],
  ['2027-02', 'Carnaval da Colmeia', 'dark', 'confetti', '#1c103b','#30204f','#23123f','#ffe45d','#ff76b7','#55e6d1'],
  ['2027-03', 'Outono de Mel', 'light', 'leaves', '#f4e8db','#fffaf3','#57301f','#9b431e','#76864b','#da9b41'],
  ['2027-04', 'Páscoa Floral', 'light', 'dots', '#f3eafa','#fffbff','#59436f','#83539f','#c86687','#e9c75d'],
  ['2027-05', 'Jardim das Abelhas', 'light', 'leaves', '#eaf2e7','#fcfff8','#254a37','#3c7447','#c17b23','#e6c85c'],
  ['2027-06', 'Arraiá TechBee', 'dark', 'plaid', '#111e34','#1b2d47','#263448','#ffcf63','#ff8b70','#7fbdd9'],
  ['2027-07', 'Inverno do Apiário', 'dark', 'winter', '#0e2029','#19323c','#123441','#b9e3ee','#e8b57c','#809ecf'],
  ['2027-08', 'Folclore Brasileiro', 'dark', 'leaves', '#10271f','#1c392e','#163f35','#eec960','#ef9778','#7dcdb1'],
  ['2027-09', 'Primavera Brasileira', 'light', 'dots', '#f6f3e7','#fffdf7','#3f5f40','#477b38','#c04473','#e8bc48'],
  ['2027-10', 'Halloween da Colmeia', 'dark', 'stars', '#1b1226','#2c203a','#291a3b','#ffad59','#c0a0ff','#b5df7b'],
  ['2027-11', 'Noite de Neon', 'dark', 'grid', '#0b1825','#13283a','#102234','#72e6ed','#f297d0','#c8b3ff'],
  ['2027-12', 'Réveillon de Ouro', 'dark', 'stars', '#111c31','#1c2b45','#15253e','#f7d897','#b6cae7','#ffffff']
];
const earned = [
  ['first-ticket','Primeiro Zumbido','light','honeycomb','#fff4d6','#fffdf6','#49321c','#99500b','#c88c2f','#eed561'],
  ['first-closed','Missão Cumprida','light','leaves','#e7f1e8','#fbfff9','#274f3e','#36734e','#b88632','#b7d7ab'],
  ['first-article-read','Biblioteca de Pólen','light','lines','#eee7d6','#fff9eb','#4c442e','#6a642f','#98613d','#caa76c'],
  ['first-feedback','Leitor Curioso','light','dots','#e7f0f7','#fcfdff','#253e5b','#346b97','#a46637','#e2c76d'],
  ['askbee-visit','Pergunte à Abelha','dark','stars','#201b39','#302949','#29223e','#d4b8ff','#f5cc7c','#90d7de'],
  ['askbee-question','Conselho da Colmeia','dark','grid','#151e3f','#242f51','#1b2645','#b0c8ff','#f3c77e','#c9a0df'],
  ['profile-update','Minha Colmeia','light','waves','#f9e8df','#fffaf7','#633e39','#a34841','#b87936','#e8b694'],
  ['ten-resolved','Operador Experiente','dark','grid','#0f2931','#1b3b43','#15333d','#91d9df','#edca81','#9fbcdf'],
  ['fifty-resolved','Guardião da Colmeia','dark','honeycomb','#202019','#303027','#26261f','#f4d878','#b6d6a6','#dec9a0'],
  ['first-article-created','Mestre do Conhecimento','dark','lines','#142c23','#224036','#19372c','#b4ddbd','#efbd90','#cbd79d'],
  ['age-1','Abelha Novata','light','dots','#fff6d8','#fffdf4','#42566c','#536c91','#987331','#c5d8a6'],
  ['age-3','Asas Firmes','light','waves','#e9eefb','#fdfdff','#3f426b','#6551a0','#437c96','#d2a664'],
  ['age-6','Colmeia Estabelecida','light','leaves','#f0e4d8','#fff9f1','#674534','#974d32','#647343','#d3a568'],
  ['age-12','Aniversário da Colmeia','dark','confetti','#2a153f','#3b2352','#301b46','#f2ce79','#efa9d8','#a6d8dd'],
  ['age-24','Lenda da Colmeia','dark','stars','#14233a','#223450','#192b44','#e5c887','#aed3f3','#c8b4de']
];
const hidden = [
  ['lucky-hive','Lucky Hive','dark','plaid','#200f1b','#351d2b','#301324','#f6d17a','#8ee0ad','#ff9ba5'],
  ['chaleira-da-rainha','Chaleira da Rainha','dark','waves','#102b32','#1d3d45','#16353d','#f7bd8b','#a0d7d8','#f7d16e']
];
function rgb(hex) { return hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v,16)); }
function luminance(hex) {
  return rgb(hex).map(v => { const n=v/255; return n<=.04045?n/12.92:((n+.055)/1.055)**2.4; }).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
}
function contrast(a,b) { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
function mix(a,b,weight) { return '#'+rgb(a).map((v,i)=>Math.round(v*(1-weight)+rgb(b)[i]*weight).toString(16).padStart(2,'0')).join(''); }
function ink(bg) { return contrast('#161b22',bg)>contrast('#fffdf6',bg)?'#161b22':'#fffdf6'; }
function accessible(color, background) {
  for(let n=0;n<=10;n++) { const result=mix(color,ink(background),n/10); if(contrast(result,background)>=4.8) return result; }
  return ink(background);
}
function palette([id,name,mode,pattern,bg,surface,nav,accent,secondary,tertiary],group) {
  const text=ink(surface), muted=mix(text,surface,.23);
  return { id,name,mode,pattern,group,bg,surface,nav,accent,secondary,tertiary,
    tokens: {
      'bg-site':bg,'bg-cartao':surface,'bg-header':nav,'bg-footer':mix(bg,surface,.5),
      'bg-input':mix(bg,surface,.6),'bg-hover':mix(surface,accent,.1),
      'texto-principal':text,'texto-secundario':muted,'texto-navegacao':ink(nav),
      'texto-nav-suave':mix(ink(nav),nav,.2),'texto-botao':ink(accent),
      'cor-amarelo':accent,'cor-laranja':secondary,'acento-terciario':tertiary,
      'cor-link':accessible(accent,surface),'cor-link-secundaria':accessible(secondary,surface),
      'borda-elemento':mix(surface,text,.21),'borda-forte':mix(surface,text,.4),
      'bg-acento':mix(surface,accent,.12),'bg-secundario':mix(surface,secondary,.1),
      'cor-preto':text,'cor-branco':surface,
      'sombra-cor':mode==='dark'?'0 0 0':'51 35 12',
      'estado-sucesso':accessible(mode==='dark'?'#8fe0b0':'#24714c',surface),
      'estado-alerta':accessible(mode==='dark'?'#f6cf80':'#946011',surface),
      'estado-erro':accessible(mode==='dark'?'#ffacaf':'#b33142',surface),
      'estado-info':accessible(mode==='dark'?'#a3ceff':'#315fad',surface)
    }
  };
}
const monthly=seasonal.map(([month,...rest])=>({...palette([`mes-${month}`,...rest],'Sazonais'),month}));
const achievements=earned.map(row=>palette(row,'Conquistas'));
const secrets=hidden.map(row=>palette(row,'Easter eggs'));
const defaults=[
  palette(['light','Mel & Marfim','light','honeycomb','#f5f1e7','#fffdf8','#262b24','#fadc21','#d86420','#6b8564'],'Padrão'),
  palette(['dark','Colmeia Noturna','dark','honeycomb','#141b1b','#202b2a','#182221','#fadc21','#ffb478','#9bbcac'],'Padrão')
];
const themes=[...monthly,...achievements,...secrets];
const byId=new Map([...defaults,...themes].map(theme=>[theme.id,theme]));
async function unlock(db,user,id) {
  if(!byId.has(id)) return false;
  const [result]=await db.query('INSERT IGNORE INTO user_themes (tenant_id, user_id, theme_id) VALUES (?, ?, ?)',[user.tenantId,user.id,id]);
  return result.affectedRows>0;
}
module.exports={themes,monthly,achievements,secrets,defaults,byId,unlock,contrast};
