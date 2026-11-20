export type SchematicCategory =
  | 'Semua'
  | 'Power & PMIC'
  | 'Charging & USB'
  | 'Display & Backlight'
  | 'CPU & Memori';

export interface BoardComponentNode {
  id: string;
  designator: string;
  name: string;
  category: Exclude<SchematicCategory, 'Semua'>;
  railName: string;
  normalVoltage: string;
  diodeMode: string;
  xPercent: number;
  yPercent: number;
  symptoms: string[];
  diagnosticSteps: string[];
  solderTips: string;
  pathDiagram: string;
}

export interface MotherboardModel {
  id: string;
  brand: 'Apple' | 'Samsung' | 'Xiaomi' | 'OPPO / Vivo';
  modelName: string;
  boardCode: string;
  soc: string;
  pmicMain: string;
  summary: string;
  powerFlowDiagram: string;
  nodes: BoardComponentNode[];
}

export const MOTHERBOARD_SCHEMATICS: MotherboardModel[] = [
  {
    id: 'iphone-15-pro',
    brand: 'Apple',
    modelName: 'iPhone 15 Pro / 15 Pro Max',
    boardCode: '820-02890-A (Dual-Layer Sandwich)',
    soc: 'A17 Pro (U1000)',
    pmicMain: '338S00946 (Main PMIC)',
    summary:
      'Board 2 lapis (sandwich) dengan jalur utama VDD_MAIN dan USB-C PD controller. Sangat sensitif terhadap panas berlebih saat pemisahan interposer.',
    powerFlowDiagram:
      '[USB-C Port J4500] -> [CD3217B12 PD] -> [SN2611 Charger IC] -> [PP_VDD_MAIN 4.0V] -> [Main PMIC 338S00946] -> [Buck Rails A17 Pro]',
    nodes: [
      {
        id: 'ip15-soc',
        designator: 'U1000',
        name: 'A17 Pro SoC & RAM PoP',
        category: 'CPU & Memori',
        railName: 'PP_VDD_CPU_P / PP_VDD_GPU',
        normalVoltage: '0.65V - 1.15V (Dinamis)',
        diodeMode: '0.025V - 0.045V (Impedansi rendah normal)',
        xPercent: 45,
        yPercent: 31,
        symptoms: [
          'Arus PSU gantung 0.08A - 0.12A lalu drop ke 0',
          'Error iTunes 4013 / 9 saat restore',
          'Bootloop logo Apple tanpa restart cepat',
        ],
        diagnosticSteps: [
          'Ukur semua jalur buck di sekitar coil PMIC sebelum curiga CPU.',
          'Pastikan jalur I2C_AP ke NAND & PMIC tidak putus atau short.',
          'Cek apakah lapisan atas dan bawah sandwich board sudah menempel sempurna.',
        ],
        solderTips:
          'Gunakan preheater 180°C merata untuk pemisahan sandwich. Untuk reball PoP atas, pakai timah pasta 138°C atau 158°C agar tidak merusak underfill CPU.',
        pathDiagram: '[Main PMIC] ===> [Coil L2100-L2106] ===> [U1000 A17 Pro Core]',
      },
      {
        id: 'ip15-nand',
        designator: 'U1800',
        name: 'NAND Flash Storage 512GB',
        category: 'CPU & Memori',
        railName: 'PP2V5_NAND / PP1V8_IO / PP0V9_NAND',
        normalVoltage: '2.50V / 1.80V / 0.90V',
        diodeMode: '0.320V - 0.450V',
        xPercent: 43,
        yPercent: 72,
        symptoms: [
          'Restart tiap 3 menit (Panic Full Log)',
          'Error 4013 atau stuck di logo Apple',
          'Memori penuh mendadak lalu mati total',
        ],
        diagnosticSteps: [
          'Ukur kapasitor C1801 (PP2V5_NAND) saat kabel USB atau baterai terpasang.',
          'Jika diode mode di PP2V5_NAND di bawah 0.050V, cek kapasitor filter di sekitar NAND.',
          'Sambungkan ke PC dan baca panic log (cari kata kunci "ANS2" atau "nvme").',
        ],
        solderTips:
          'Wajib bersihkan lem hitam (black epoxy) di pinggiran NAND di suhu 210°C pakai pisau cukur khusus sebelum angkat IC di suhu 350°C angin 3.',
        pathDiagram: '[PMIC LDO] -> [C1801 PP2V5_NAND] -> [U1800 NAND] <-> [PCIe Bus CPU]',
      },
      {
        id: 'ip15-pmic',
        designator: 'U2700',
        name: 'Main PMIC (Power Management IC)',
        category: 'Power & PMIC',
        railName: 'PP_VDD_MAIN & LDO Outputs',
        normalVoltage: '3.8V - 4.2V Input / 0.8V - 3.0V Output',
        diodeMode: '0.360V (VDD_MAIN)',
        xPercent: 79,
        yPercent: 34,
        symptoms: [
          'HP mati total, konsumsi arus 0.00A saat ditekan power',
          'Panas berlebih di area kanan atas dekat kaleng',
          'Banyak tegangan buck/LDO hilang bersamaan',
        ],
        diagnosticSteps: [
          'Cek jalur VDD_MAIN apakah short ke ground menggunakan buzzer/diode mode.',
          'Ukur tegangan PP1V8_ALWAYS di kapasitor output PMIC.',
          'Jika short, suntik tegangan aman 1.0V-1.5V (max 2A) dan cek titik panas pakai rosin/thermal cam.',
        ],
        solderTips:
          'Tutupi konektor FPC di sebelah PMIC dengan kapton tape + pelat pelindung panas. Angkat di 340°C dan cetak kaki pakai stencil presisi + timah 183°C.',
        pathDiagram: '[PP_VDD_MAIN] -> [U2700 PMIC] -> [12 Buck Coils + 20 LDO Rails]',
      },
      {
        id: 'ip15-charger',
        designator: 'U3300',
        name: 'Charging IC & Hydra USB-C Controller',
        category: 'Charging & USB',
        railName: 'PP5V0_USB_VBUS / PP_BATT_VCC',
        normalVoltage: '5.0V - 9.0V (Fast Charge) / 4.2V Batt',
        diodeMode: '0.410V (VBUS) / 0.355V (CC1/CC2)',
        xPercent: 81,
        yPercent: 67,
        symptoms: [
          'Persentase baterai tidak naik atau fake charging',
          'Tidak terdeteksi komputer / aksesori tidak didukung',
          'Baterai cepat drop meski baru diganti',
        ],
        diagnosticSteps: [
          'Ukur pin CC1 & CC2 pada konektor USB-C (harus seimbang di kisaran 0.350V-0.550V diode mode).',
          'Cek apakah VBUS 5V masuk sampai kapasitor input sebelum IC U3300.',
          'Pastikan tidak ada jalur I2C menuju baterai yang putus (SWI/HDQ).',
        ],
        solderTips:
          'Gunakan fluks gel berkualitas (Amtech/Kingbo original), suhu blower 330°C angin 3. Pastikan semua bola timah BGA rata sebelum ditempel.',
        pathDiagram: '[Port Type-C] -> [Protection Diode] -> [U3300 Charger] -> [Konektor Baterai]',
      },
      {
        id: 'ip15-coil',
        designator: 'L4020',
        name: 'Induktor Utama VDD_BOOST (4R7)',
        category: 'Power & PMIC',
        railName: 'PP_VDD_BOOST',
        normalVoltage: '4.0V - 4.5V',
        diodeMode: '0.350V',
        xPercent: 30,
        yPercent: 48,
        symptoms: [
          'Layar tiba-tiba redup atau mati saat kamera/speaker nyala',
          'Suara berdengung pelan dari dalam board',
          'HP restart saat beban berat',
        ],
        diagnosticSteps: [
          'Ukur resistansi coil 4R7 (harus mendekati 0.3 - 0.8 Ohm, tidak boleh putus/OL).',
          'Cek kapasitor keramik besar (C4021/C4022) di sebelahnya apakah retak atau short.',
        ],
        solderTips:
          'Coil cukup tebal dan menyerap panas; bantu panaskan dengan solder ujung pisau + sedikit timah segar di kedua kaki sebelum diangkat.',
        pathDiagram: '[VDD_MAIN] -> [L4020 4R7 Coil] -> [Boost IC] -> [Audio Amp & Flash]',
      },
      {
        id: 'ip15-fpc',
        designator: 'J4200',
        name: 'Konektor Display OLED & Touch FPC',
        category: 'Display & Backlight',
        railName: 'PP_LCM_ELVDD / PP_LCM_ELVSS / MIPI_DATA',
        normalVoltage: '+4.6V / -4.4V / 1.8V',
        diodeMode: '0.290V - 0.520V (MIPI Filter)',
        xPercent: 18,
        yPercent: 82,
        symptoms: [
          'Layar gelap (blank hitam) tapi mesin getar & berdering',
          'Touchscreen tidak merespon sebagian atau ghost touch',
          'Garis hijau/putih setelah jatuh atau ganti LCD',
        ],
        diagnosticSteps: [
          'Periksa kaki pin konektor FPC di bawah mikroskop apakah ada yang bengkok atau korosi.',
          'Ukur semua filter EMI MIPI di dekat konektor; setiap pasang harus punya nilai diode mode sama (~0.320V).',
          'Cek tegangan +4.6V ELVDD dan -4.4V ELVSS muncul sesaat setelah layar dipasang dan power ditekan.',
        ],
        solderTips:
          'Jangan menembak konektor plastik FPC langsung dari atas! Panaskan dari bawah board (preheater) atau gunakan nozzle kecil di suhu 290°C-305°C sambil pegang pinset.',
        pathDiagram: '[Display PMIC] -> [ELVDD/ELVSS] + [CPU MIPI] -> [EMI Filter] -> [J4200 FPC]',
      },
    ],
  },
  {
    id: 'samsung-a54-s23',
    brand: 'Samsung',
    modelName: 'Samsung Galaxy A54 / S23 Series',
    boardCode: 'GH82-30812A (Single-Layer Mainboard)',
    soc: 'Exynos 1380 / Snapdragon 8 Gen 2',
    pmicMain: 'S2MPU15 / PM8550',
    summary:
      'Mainboard satu lapis yang lega untuk dikerjakan pemula. Kasus paling sering adalah jalur VBUS sub-board putus, moisture detected, dan IC display PMIC.',
    powerFlowDiagram:
      '[Sub-Board USB] -> [FPC Main-to-Sub] -> [OVP IC] -> [Sub-PMIC Charger] -> [VBAT / VPH_PWR 4.0V] -> [Main PMIC]',
    nodes: [
      {
        id: 'sam-ovp',
        designator: 'U5001',
        name: 'OVP (Over Voltage Protection) IC',
        category: 'Charging & USB',
        railName: 'VBUS_IN_5V -> VBUS_CHG_OUT',
        normalVoltage: '5.0V / 9.0V PD',
        diodeMode: '0.450V Input / 0.420V Output',
        xPercent: 80,
        yPercent: 66,
        symptoms: [
          'Tidak bisa cas sama sekali meski sub-board sudah diganti',
          'Muncul peringatan kelembapan (Moisture Detected) terus-menerus',
          'Tegangan 5V berhenti di kapasitor sebelum IC charging',
        ],
        diagnosticSteps: [
          'Ukur tegangan di kapasitor input OVP saat charger dicolok (wajib 5.0V).',
          'Ukur kapasitor output OVP; jika 0V padahal input 5V, OVP rusak/memutus.',
          'Untuk pengetesan sementara, bisa jumper langsung input ke output hanya untuk cek apakah IC Charger hidup (wajib ganti IC OVP permanen setelah tes!).',
        ],
        solderTips:
          'Ukuran IC OVP mungil (WLCSP). Gunakan fluks tipis, suhu 325°C angin 2.5 agar tidak terbang tertiup angin blower.',
        pathDiagram: '[FPC Sub-Board] -> [C5002 5V] -> [U5001 OVP] -> [Sub-PMIC Charging]',
      },
      {
        id: 'sam-subpmic',
        designator: 'U5004',
        name: 'Sub-PMIC & Fast Charging Controller',
        category: 'Power & PMIC',
        railName: 'VPH_PWR (Sistem Utama)',
        normalVoltage: '3.8V - 4.2V',
        diodeMode: '0.350V - 0.390V',
        xPercent: 78,
        yPercent: 34,
        symptoms: [
          'HP mati total, arus PSU langsung loncat (short VPH_PWR)',
          'Charging lambat hanya 0.4A (tidak mau fast charging)',
          'IC terasa panas meski baterai dilepas dan dicolok charger',
        ],
        diagnosticSteps: [
          'Cek coil besar (L5002) di samping Sub-PMIC terhadap ground (mode dioda).',
          'Jika short di VPH_PWR, lepaskan coil agar ketahuan short ada di sisi Sub-PMIC atau sisi beban Mainboard.',
        ],
        solderTips:
          'Bersihkan area sekitar dari lem putih tipis, panaskan merata di 340°C. Perhatikan titik orientasi pin 1 di sudut IC.',
        pathDiagram: '[VBUS_CHG] -> [U5004 Sub-PMIC] -> [L5002 Coil] -> [VPH_PWR ke Seluruh Board]',
      },
      {
        id: 'sam-disp-pmic',
        designator: 'U7001',
        name: 'AMOLED Display Power IC',
        category: 'Display & Backlight',
        railName: 'ELVDD_4P6V / ELVSS_-4P4V / VCI_3P0V',
        normalVoltage: '+4.6V / -4.4V / +3.0V',
        diodeMode: '0.380V - 0.480V',
        xPercent: 20,
        yPercent: 79,
        symptoms: [
          'Layar gelap total setelah ganti LCD baru atau kena air',
          'Layar berkedip hijau terang saat kecerahan diturunkan',
        ],
        diagnosticSteps: [
          'Cek kapasitor output di dekat konektor LCD (HDC7000) untuk memastikan ELVDD +4.6V dan ELVSS -4.4V keluar.',
          'Jika tidak keluar, ukur sinyal EN (Enable) 1.8V dari CPU ke IC Display.',
        ],
        solderTips:
          'Gunakan timah pasta suhu rendah (138°C) di kaki kapasitor sekitar saat melepas kaleng pelindung agar konektor LCD tidak meleleh.',
        pathDiagram: '[VPH_PWR] -> [U7001 AMOLED IC] -> [Coil L7001] -> [Pin Konektor LCD]',
      },
      {
        id: 'sam-cpu',
        designator: 'UCP300',
        name: 'SoC Processor & UFS Combo',
        category: 'CPU & Memori',
        railName: 'VDD_CPU_BIG / VDD_MEM_1V1',
        normalVoltage: '0.70V - 1.05V',
        diodeMode: '0.030V - 0.080V',
        xPercent: 45,
        yPercent: 32,
        symptoms: [
          'Hang di logo Samsung lalu restart terus',
          'Sinyal WiFi dan Bluetooth abu-abu setelah HP jatuh keras',
        ],
        diagnosticSteps: [
          'Cek semua tegangan LDO dan Buck dari Main PMIC terlebih dahulu.',
          'Tes tekan pelan area RAM/CPU saat dinyalakan via PSU untuk mendeteksi solder ball retak (cold solder).',
        ],
        solderTips:
          'Reballing CPU/RAM butuh suhu terukur 350°C-365°C untuk melepas, dan 210°C dengan mata solder + wick untuk membersihkan pad tanpa menggores PCB.',
        pathDiagram: '[Main PMIC] -> [Buck Coils] -> [UCP300 SoC] <-> [UFS Storage]',
      },
    ],
  },
  {
    id: 'xiaomi-redmi-note',
    brand: 'Xiaomi',
    modelName: 'Xiaomi Redmi Note 12 / 13 Pro',
    boardCode: '23021RAAEG (Qualcomm / Dimensity)',
    soc: 'Snapdragon 685 / 7s Gen 2',
    pmicMain: 'PM6225 / PMI632',
    summary:
      'Board favorit teknisi karena jalur mudah dilacak. Kasus paling umum di seri Redmi adalah short di jalur VPH_PWR, IC Lampu (Backlight) putus setelah kena air, dan mati total karena UFS/PMIC.',
    powerFlowDiagram:
      '[USB Type-C] -> [PMI632 Charger/PMIC] -> [VPH_PWR 4.0V] -> [PM6225 Main PMIC] -> [CPU & Backlight Driver]',
    nodes: [
      {
        id: 'xia-pmi',
        designator: 'U1101',
        name: 'PMI632 Power & Charging IC',
        category: 'Charging & USB',
        railName: 'USB_IN / VPH_PWR',
        normalVoltage: '5.0V / 9.0V -> 4.0V VPH_PWR',
        diodeMode: '0.365V (VPH_PWR)',
        xPercent: 79,
        yPercent: 52,
        symptoms: [
          'Mati total setelah dicas pakai charger tidak ori / di mobil',
          'LED indikator kedip merah tapi HP tidak mau nyala',
          'Arus cas stuck di 0.1A',
        ],
        diagnosticSteps: [
          'Ukur kapasitor jalur VPH_PWR (biasanya kapasitor coklat besar di sekitar L1101).',
          'Cek apakah tegangan VREG_LDO 1.8V muncul saat tombol power ditekan.',
        ],
        solderTips:
          'PMI632 tidak dilem pada kebanyakan varian Redmi Note; angkat di suhu 335°C angin 3.5 dengan fluks secukupnya.',
        pathDiagram: '[USB_VBUS] -> [U1101 PMI632] -> [L1101 Switching Coil] -> [VPH_PWR]',
      },
      {
        id: 'xia-backlight',
        designator: 'U2401',
        name: 'Backlight Driver & Dioda Schottky',
        category: 'Display & Backlight',
        railName: 'LCD_BL_LED_A (Anoda Lampu)',
        normalVoltage: '18V - 24V (Saat layar aktif)',
        diodeMode: '0.480V (Kaki Anoda)',
        xPercent: 21,
        yPercent: 78,
        symptoms: [
          'Gambar terlihat samar-samar jika disenter senter HP, tapi lampu layar mati',
          'Layar nyala sebentar 1 detik lalu gelap',
        ],
        diagnosticSteps: [
          'Ukur jalur Anoda (LED_A) di konektor LCD pada mode dioda; jika OL (putus), cek fuse/resistor 0 Ohm atau coil backlight.',
          'Jika nilai diode mode 0.00V (short), ganti kapasitor filter 25V/35V atau dioda Schottky di samping coil 10uH/22uH.',
        ],
        solderTips:
          'Wajib perhatikan tanda garis katoda (kaki minus/plus) pada Dioda Backlight! Jika terbalik, IC lampu langsung terbakar saat dinyalakan.',
        pathDiagram: '[VPH_PWR] -> [Coil 10uH] -> [Dioda Schottky] -> [Kapasitor 25V] -> [LED_A LCD]',
      },
      {
        id: 'xia-cpu',
        designator: 'U0401',
        name: 'Snapdragon SoC & UFS 2.2',
        category: 'CPU & Memori',
        railName: 'VDD_CX / VDD_MX / VCC_UFS',
        normalVoltage: '0.75V / 0.85V / 2.95V',
        diodeMode: '0.040V (Core) / 0.380V (VCC_UFS)',
        xPercent: 46,
        yPercent: 34,
        symptoms: [
          'Mati mendadak saat main game / update MIUI/HyperOS',
          'Terdeteksi Qualcomm HS-USB QDLoader 9008 di PC',
        ],
        diagnosticSteps: [
          'Colok ke PC: jika langsung masuk 9008 tanpa tekan tombol, cek tegangan VCC (2.95V) & VCCQ (1.2V/1.8V) ke IC UFS dulu sebelum vonis CPU.',
          'Jika tegangan UFS hadir normal tapi tetap 9008, kemungkinan besar IC UFS rusak atau perlu reball CPU.',
        ],
        solderTips:
          'Gunakan timah pasta 183°C untuk reball CPU Snapdragon agar daya tahan panasnya kuat saat HP dipakai bermain game.',
        pathDiagram: '[Main PMIC] -> [VCC 2.95V & VCCQ 1.2V] -> [UFS Storage] <-> [U0401 CPU]',
      },
    ],
  },
  {
    id: 'oppo-vivo-mtk',
    brand: 'OPPO / Vivo',
    modelName: 'OPPO Reno / Vivo V-Series (MTK)',
    boardCode: 'MT6877 / MT6360 Architecture',
    soc: 'MediaTek Dimensity Series',
    pmicMain: 'MT6360 + MT6365',
    summary:
      'Arsitektur MediaTek modern memakai kombinasi PMIC utama MT6365 dan Sub-PMIC MT6360. Sangat sering ditemui kasus baseband hilang (IMEI null) atau baterai error temperatur.',
    powerFlowDiagram:
      '[USB Type-C] -> [MT6360 Sub-PMIC] -> [VSYS 4.0V] -> [MT6365 Main PMIC] -> [Dimensity SoC & MT6190 RF]',
    nodes: [
      {
        id: 'ov-mt6360',
        designator: 'U2000',
        name: 'MT6360 Sub-PMIC & Flash/Charger',
        category: 'Charging & USB',
        railName: 'VSYS / VBUS_MTK',
        normalVoltage: '3.9V - 4.2V VSYS',
        diodeMode: '0.355V',
        xPercent: 78,
        yPercent: 40,
        symptoms: [
          'HP hanya getar pendek tanpa tampil gambar',
          'Muncul peringatan "Suhu baterai terlalu rendah/tinggi, pengisian dihentikan"',
        ],
        diagnosticSteps: [
          'Untuk error suhu baterai, ukur jalur BAT_ID dan NTC (Thermistor) di konektor baterai — biasanya resistor pull-up 10K Ohm korosi.',
          'Ukur tegangan VSYS di coil sebelah MT6360.',
        ],
        solderTips:
          'Cek resistor 10K/100K jalur NTC dengan pinset tajam sebelum memutuskan mengganti IC MT6360.',
        pathDiagram: '[Baterai NTC Pin] -> [Resistor 10K] -> [MT6360 ADC] -> [CPU]',
      },
      {
        id: 'ov-rf',
        designator: 'U6100',
        name: 'RF Transceiver & WTR / MT6190',
        category: 'Power & PMIC',
        railName: 'VRF18_PMU / VRF12_PMU',
        normalVoltage: '1.80V & 1.20V',
        diodeMode: '0.390V - 0.440V',
        xPercent: 79,
        yPercent: 72,
        symptoms: [
          'Sinyal bulat silang / Tidak Ada Layanan padahal kartu SIM terbaca',
          'HP boros baterai & cepat panas di bagian belakang bawah kamera',
        ],
        diagnosticSteps: [
          'Cek apakah IMEI masih muncul (*#06#). Jika IMEI masih ada tapi sinyal silang, ukur VRF18 & VRF12 di sekitar IC RF.',
          'Periksa juga kabel antena koaksial dan IC PA (Power Amplifier) apakah short ke ground.',
        ],
        solderTips:
          'IC RF tipis dan rapuh. Angkat di 320°C dengan pinset tumpul jangan sampai pinggiran IC cuil.',
        pathDiagram: '[MT6365 PMIC] -> [VRF18 / VRF12] -> [U6100 RF Transceiver] -> [PA] -> [Antena]',
      },
    ],
  },
];
