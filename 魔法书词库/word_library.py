#!/usr/bin/env python3
"""
言灵词典 - Word Library
2D横版自由放置塔防游戏词库
约200个英语词汇，兼具英语学习与游戏言灵收集功能

数据结构: {word, meaning, category, rarity, effect, description}
"""

WORD_LIBRARY = [
    {"word": "open", "meaning": "打开", "category": "A", "rarity": "Common", "effect": "解锁新区域", "description": "言灵之力，推开封闭之门。开启宝箱、大门、未知领域。"},
    {"word": "close", "meaning": "关闭", "category": "A", "rarity": "Common", "effect": "封锁路径", "description": "关闭身后的门，阻挡追兵。防御战术中的基础言灵。"},
    {"word": "move", "meaning": "移动", "category": "A", "rarity": "Common", "effect": "单位位移", "description": "万物皆可动。最基础的言灵，赋予物体移动之力。"},
    {"word": "take", "meaning": "拿取", "category": "A", "rarity": "Common", "effect": "拾取物品", "description": "伸手可得。收集资源、捡起道具的必备言灵。"},
    {"word": "make", "meaning": "制造", "category": "A", "rarity": "Common", "effect": "合成道具", "description": "从无到有的创造。工匠之魂寄宿于此词之中。"},
    {"word": "break", "meaning": "打破", "category": "A", "rarity": "Common", "effect": "破坏障碍物", "description": "粉碎阻碍之物。对敌方建筑造成额外伤害。"},
    {"word": "push", "meaning": "推动", "category": "A", "rarity": "Common", "effect": "击退敌人", "description": "无形之力向前推去。将敌人推出防线范围。"},
    {"word": "pull", "meaning": "拉动", "category": "A", "rarity": "Common", "effect": "拉拽敌人", "description": "引力般的力量。将远处敌人拉至近前。"},
    {"word": "throw", "meaning": "投掷", "category": "A", "rarity": "Common", "effect": "投掷道具", "description": "奋力一掷。投掷类物品的射程与威力提升。"},
    {"word": "catch", "meaning": "接住", "category": "A", "rarity": "Common", "effect": "拦截飞行物", "description": "眼疾手快。有一定概率拦截敌方远程攻击。"},
    {"word": "climb", "meaning": "攀爬", "category": "A", "rarity": "Common", "effect": "翻越障碍", "description": "向上攀登的力量。允许单位翻越低矮障碍物。"},
    {"word": "jump", "meaning": "跳跃", "category": "A", "rarity": "Common", "effect": "跳过陷阱", "description": "一跃而起。短暂腾空躲避地面陷阱与攻击。"},
    {"word": "run", "meaning": "奔跑", "category": "A", "rarity": "Common", "effect": "加速移动", "description": "疾风般的速度。短时间内大幅提升移动速度。"},
    {"word": "hide", "meaning": "隐藏", "category": "A", "rarity": "Common", "effect": "单位隐身", "description": "藏于暗处。让单位暂时不被敌人发现。"},
    {"word": "seek", "meaning": "寻找", "category": "A", "rarity": "Common", "effect": "发现隐藏", "description": "寻寻觅觅。揭示隐藏的敌人、宝物或通道。"},
    {"word": "build", "meaning": "建造", "category": "A", "rarity": "Common", "effect": "加速建造", "description": "一砖一瓦筑起防线。建造速度提升的基石言灵。"},
    {"word": "destroy", "meaning": "摧毁", "category": "A", "rarity": "Rare", "effect": "即死低血量敌人", "description": "毁灭的意志。对低血量敌人有概率直接消灭。"},
    {"word": "collect", "meaning": "收集", "category": "A", "rarity": "Common", "effect": "自动拾取范围+", "description": "聚沙成塔。扩大资源自动收集的范围。"},
    {"word": "choose", "meaning": "选择", "category": "A", "rarity": "Common", "effect": "重铸一次选项", "description": "命运的分岔路。允许在随机事件中重新选择一次。"},
    {"word": "return", "meaning": "返回", "category": "A", "rarity": "Common", "effect": "单位召回", "description": "归去来兮。将场上单位瞬间召回至部署点。"},
    {"word": "light", "meaning": "光", "category": "A", "rarity": "Common", "effect": "照亮黑暗区域", "description": "驱散黑暗的第一缕光。照亮迷雾与阴影覆盖的区域。"},
    {"word": "water", "meaning": "水", "category": "A", "rarity": "Common", "effect": "灭火与清洗", "description": "生命之源。可熄灭火焰、清洗毒素与酸液。"},
    {"word": "fire", "meaning": "火", "category": "A", "rarity": "Common", "effect": "点燃目标", "description": "文明之始。点燃可燃物，对敌人造成持续灼烧。"},
    {"word": "book", "meaning": "书", "category": "A", "rarity": "Common", "effect": "获得随机知识", "description": "书中自有黄金屋。阅读后随机获得一个增益效果。"},
    {"word": "door", "meaning": "门", "category": "A", "rarity": "Common", "effect": "创建临时通道", "description": "通往未知的入口。在指定位置开启一扇临时传送门。"},
    {"word": "key", "meaning": "钥匙", "category": "A", "rarity": "Common", "effect": "解锁上锁宝箱", "description": "开启秘密的凭证。解锁特殊宝箱与隐藏区域。"},
    {"word": "road", "meaning": "道路", "category": "A", "rarity": "Common", "effect": "铺设临时路径", "description": "路在脚下。在不可行走区域铺设临时路径。"},
    {"word": "bridge", "meaning": "桥", "category": "A", "rarity": "Common", "effect": "跨越沟壑", "description": "天堑变通途。在沟壑或水域上架起临时桥梁。"},
    {"word": "map", "meaning": "地图", "category": "A", "rarity": "Common", "effect": "揭示小地图", "description": "纸上乾坤。揭示当前关卡的小地图全貌。"},
    {"word": "tool", "meaning": "工具", "category": "A", "rarity": "Common", "effect": "修复效率+", "description": "工欲善其事。提升所有建造与修复的效率。"},
    {"word": "box", "meaning": "盒子", "category": "A", "rarity": "Common", "effect": "获得随机补给", "description": "潘多拉之盒。打开后获得随机资源或道具。"},
    {"word": "ring", "meaning": "戒指", "category": "A", "rarity": "Rare", "effect": "小幅度全属性+", "description": "圆环之理。佩戴后全属性小幅提升的饰品言灵。"},
    {"word": "bell", "meaning": "铃铛", "category": "A", "rarity": "Common", "effect": "警报提醒", "description": "清脆之声。敌人接近时发出预警，提前准备。"},
    {"word": "flag", "meaning": "旗帜", "category": "A", "rarity": "Common", "effect": "范围增益光环", "description": "旗帜所向。竖起旗帜为周围友方提供士气加成。"},
    {"word": "mirror", "meaning": "镜子", "category": "A", "rarity": "Rare", "effect": "反射远程攻击", "description": "镜中之界。有一定概率反射敌方远程弹道攻击。"},
    {"word": "glass", "meaning": "玻璃", "category": "A", "rarity": "Common", "effect": "脆弱但透明", "description": "晶莹剔透。可透视障碍物后方，但一击即碎。"},
    {"word": "paper", "meaning": "纸", "category": "A", "rarity": "Common", "effect": "记录信息", "description": "白纸黑字。记录敌人信息，揭示其弱点属性。"},
    {"word": "stone", "meaning": "石头", "category": "A", "rarity": "Common", "effect": "投石攻击", "description": "最原始的武器。投掷石块造成基础物理伤害。"},
    {"word": "wood", "meaning": "木头", "category": "A", "rarity": "Common", "effect": "基础建材", "description": "森林的馈赠。最基础的建筑材料，便宜且可再生。"},
    {"word": "iron", "meaning": "铁", "category": "A", "rarity": "Common", "effect": "强化建筑耐久", "description": "坚硬的金属。提升建筑生命值，是升级的必备材料。"},
    {"word": "silver", "meaning": "银", "category": "A", "rarity": "Rare", "effect": "对亡灵伤害+", "description": "月光之金属。对亡灵与暗影生物造成额外伤害。"},
    {"word": "seed", "meaning": "种子", "category": "A", "rarity": "Common", "effect": "种植植物", "description": "希望的起点。种下种子，随时间生长为防御植物。"},
    {"word": "flower", "meaning": "花", "category": "A", "rarity": "Common", "effect": "范围治疗", "description": "绽放的生命。花朵散发芬芳，缓慢治疗周围友方。"},
    {"word": "bread", "meaning": "面包", "category": "A", "rarity": "Common", "effect": "恢复生命值", "description": "日常的温暖。消耗品，恢复单位少量生命值。"},
    {"word": "coin", "meaning": "硬币", "category": "A", "rarity": "Common", "effect": "获得额外金币", "description": "财富的象征。使用后立即获得一定数量的金币。"},
    {"word": "home", "meaning": "家", "category": "A", "rarity": "Common", "effect": "基地回血加速", "description": "归宿之地。回到基地附近时生命恢复速度大幅提升。"},
    {"word": "friend", "meaning": "朋友", "category": "A", "rarity": "Common", "effect": "友方单位协同", "description": "并肩作战。相邻友方单位获得攻击与防御加成。"},
    {"word": "name", "meaning": "名字", "category": "A", "rarity": "Common", "effect": "词库解锁提示", "description": "万物有名。揭示未收集言灵的名称与获取线索。"},
    {"word": "word", "meaning": "词语", "category": "A", "rarity": "Common", "effect": "言灵收集效率+", "description": "言灵本身。这是言灵词典的第一个词，提升新词获取概率。"},
    {"word": "story", "meaning": "故事", "category": "A", "rarity": "Common", "effect": "解锁世界观碎片", "description": "流传的叙事。每收集一个故事词，解锁一段世界观文本。"},
    {"word": "song", "meaning": "歌曲", "category": "A", "rarity": "Rare", "effect": "范围增益持续", "description": "旋律的力量。吟唱后为全屏友方提供持续增益效果。"},
    {"word": "game", "meaning": "游戏", "category": "A", "rarity": "Common", "effect": "小概率获得双倍奖励", "description": "乐在其中。完成关卡时有概率获得双倍资源奖励。"},
    {"word": "peace", "meaning": "和平", "category": "A", "rarity": "Rare", "effect": "短暂停战", "description": "和平的祈愿。使敌人停止攻击3秒，但期间也无法造成伤害。"},
    {"word": "war", "meaning": "战争", "category": "A", "rarity": "Rare", "effect": "全体攻击力+", "description": "战争的号角。主动激活后全屏友方攻击力临时提升。"},
    {"word": "life", "meaning": "生命", "category": "A", "rarity": "Rare", "effect": "复活一个单位", "description": "生命的赞歌。将场上一个阵亡单位复活并恢复半血。"},
    {"word": "death", "meaning": "死亡", "category": "A", "rarity": "Rare", "effect": "即死一个普通敌人", "description": "终焉的低语。对非Boss敌人造成即死效果，冷却时间极长。"},
    {"word": "health", "meaning": "健康", "category": "A", "rarity": "Common", "effect": "持续恢复生命", "description": "健康之躯。被动提升所有单位的基础生命恢复速度。"},
    {"word": "dream", "meaning": "梦", "category": "A", "rarity": "Common", "effect": "随机增益效果", "description": "梦中的可能性。使用后获得一个随机正面增益效果。"},
    {"word": "fear", "meaning": "恐惧", "category": "A", "rarity": "Common", "effect": "敌人短暂逃跑", "description": "内心的暗影。让范围内敌人陷入恐惧，反向逃跑1.5秒。"},
    {"word": "courage", "meaning": "勇气", "category": "A", "rarity": "Rare", "effect": "免疫恐惧与眩晕", "description": "无畏之心。赋予友方单位免疫恐惧与眩晕的能力。"},
    {"word": "wisdom", "meaning": "智慧", "category": "A", "rarity": "Rare", "effect": "经验获取+", "description": "智者的遗产。击败敌人获得的经验值提升。"},
    {"word": "truth", "meaning": "真理", "category": "A", "rarity": "Rare", "effect": "看破敌人弱点", "description": "真实之眼。揭示敌人的隐藏属性与弱点。"},
    {"word": "power", "meaning": "力量", "category": "A", "rarity": "Common", "effect": "攻击力小幅度+", "description": "力量的涌动。基础攻击力提升的常驻言灵。"},
    {"word": "heart", "meaning": "心", "category": "A", "rarity": "Common", "effect": "基地生命上限+", "description": "跳动的心脏。提升基地最大生命值。"},
    {"word": "mind", "meaning": "心智", "category": "A", "rarity": "Rare", "effect": "抵抗精神控制", "description": "钢铁意志。保护友方单位不被敌方精神控制类技能影响。"},
    {"word": "hand", "meaning": "手", "category": "A", "rarity": "Common", "effect": "操作速度+", "description": "灵巧的双手。提升建造与交互的操作速度。"},
    {"word": "eye", "meaning": "眼睛", "category": "A", "rarity": "Common", "effect": "视野范围+", "description": "洞察之眼。扩大战场视野，提前发现远处敌人。"},
    {"word": "voice", "meaning": "声音", "category": "A", "rarity": "Common", "effect": "声波探测", "description": "回响之音。发出声波探测周围隐藏的敌人与陷阱。"},
    {"word": "path", "meaning": "路径", "category": "A", "rarity": "Common", "effect": "显示敌人路线", "description": "预知之路。显示当前关卡中敌人的行进路线。"},
    {"word": "step", "meaning": "步伐", "category": "A", "rarity": "Common", "effect": "移动无声", "description": "轻盈的脚步。降低单位移动时被敌人发现的概率。"},
    {"word": "sleep", "meaning": "睡眠", "category": "A", "rarity": "Common", "effect": "敌人沉睡", "description": "安眠之咒。让范围内敌人陷入沉睡，持续2秒。"},
    {"word": "wake", "meaning": "醒来", "category": "A", "rarity": "Common", "effect": "解除沉睡与眩晕", "description": "破晓之光。唤醒被沉睡或眩晕的友方单位。"},
    {"word": "eat", "meaning": "吃", "category": "A", "rarity": "Common", "effect": "消耗品效果+", "description": "饱食之力。提升所有消耗品的使用效果。"},
    {"word": "drink", "meaning": "喝", "category": "A", "rarity": "Common", "effect": "药水持续延长", "description": "甘泉润喉。延长药水类道具的持续时间。"},
    {"word": "see", "meaning": "看见", "category": "A", "rarity": "Common", "effect": "识破隐身", "description": "真实视界。看见并标记范围内的隐身敌人。"},
    {"word": "hear", "meaning": "听见", "category": "A", "rarity": "Common", "effect": "预警范围+", "description": "顺风之耳。大幅扩大敌人接近的预警范围。"},
    {"word": "speak", "meaning": "说话", "category": "A", "rarity": "Common", "effect": "与NPC交互", "description": "交流的桥梁。解锁与游戏中NPC的对话与交易功能。"},
    {"word": "read", "meaning": "阅读", "category": "A", "rarity": "Common", "effect": "解锁石碑文字", "description": "文字的解读者。可以阅读古代石碑与卷轴上的信息。"},
    {"word": "write", "meaning": "书写", "category": "A", "rarity": "Common", "effect": "记录传送点", "description": "笔墨留痕。在当前位置记录一个传送点，可随时返回。"},
    {"word": "learn", "meaning": "学习", "category": "A", "rarity": "Common", "effect": "词库解锁加速", "description": "学无止境。提升新言灵的发现与解锁速度。"},
    {"word": "sun", "meaning": "太阳", "category": "B", "rarity": "Common", "effect": "白天增益", "description": "万物生长的源泉。白昼时友方单位攻击力与生命回复提升。"},
    {"word": "moon", "meaning": "月亮", "category": "B", "rarity": "Common", "effect": "夜晚增益", "description": "银色的守护者。夜晚时友方单位闪避率与暴击率提升。"},
    {"word": "star", "meaning": "星星", "category": "B", "rarity": "Common", "effect": "指引方向", "description": "夜空中的导航者。在迷雾关卡中始终显示正确方向。"},
    {"word": "sky", "meaning": "天空", "category": "B", "rarity": "Common", "effect": "飞行单位召唤", "description": "苍穹之域。解锁飞行单位的部署权限。"},
    {"word": "cloud", "meaning": "云", "category": "B", "rarity": "Common", "effect": "制造迷雾掩护", "description": "飘渺的屏障。在指定区域制造云雾，遮挡敌人视线。"},
    {"word": "rain", "meaning": "雨", "category": "B", "rarity": "Common", "effect": "全场减速与灭火", "description": "天降甘霖。召唤降雨，减速所有敌人并熄灭火焰。"},
    {"word": "snow", "meaning": "雪", "category": "B", "rarity": "Common", "effect": "区域减速", "description": "冬日的呼吸。在指定区域降雪，大幅减速经过的敌人。"},
    {"word": "wind", "meaning": "风", "category": "B", "rarity": "Common", "effect": "击退与加速", "description": "无形之手。召唤强风击退敌人，或为友方加速。"},
    {"word": "storm", "meaning": "风暴", "category": "B", "rarity": "Rare", "effect": "大范围雷击伤害", "description": "天怒之威。召唤暴风雨，在范围内随机落雷造成伤害。"},
    {"word": "thunder", "meaning": "雷霆", "category": "B", "rarity": "Rare", "effect": "单体高伤+眩晕", "description": "宙斯之怒。对单个敌人造成高额伤害并眩晕1秒。"},
    {"word": "earth", "meaning": "大地", "category": "B", "rarity": "Common", "effect": "地面加固", "description": "厚德载物。加固地面，使敌人无法挖掘或钻地。"},
    {"word": "mountain", "meaning": "山", "category": "B", "rarity": "Rare", "effect": "制造不可通行地形", "description": "巍峨不动。在指定位置升起一座小山，阻挡敌人。"},
    {"word": "river", "meaning": "河流", "category": "B", "rarity": "Common", "effect": "冲刷敌人", "description": "奔流不息。召唤一条河流，冲走路径上的敌人。"},
    {"word": "ocean", "meaning": "海洋", "category": "B", "rarity": "Rare", "effect": "大范围水淹", "description": "汪洋之力。召唤巨浪淹没大片区域，持续造成伤害。"},
    {"word": "lake", "meaning": "湖泊", "category": "B", "rarity": "Common", "effect": "创造水域减速", "description": "静谧之泽。在指定位置创造湖泊，持续减速踏入的敌人。"},
    {"word": "forest", "meaning": "森林", "category": "B", "rarity": "Common", "effect": "自然单位增益", "description": "翠绿之海。在森林地形中，自然系单位全属性提升。"},
    {"word": "desert", "meaning": "沙漠", "category": "B", "rarity": "Rare", "effect": "持续灼烧伤害", "description": "炙热荒原。将一片区域变为沙漠，持续灼烧敌人。"},
    {"word": "island", "meaning": "岛屿", "category": "B", "rarity": "Rare", "effect": "创造孤立地形", "description": "孤悬之地。在战场中创造一块孤立高地，部署远程单位。"},
    {"word": "field", "meaning": "田野", "category": "B", "rarity": "Common", "effect": "资源产量+", "description": "丰收之地。在田野上资源产出速度提升。"},
    {"word": "cave", "meaning": "洞穴", "category": "B", "rarity": "Common", "effect": "隐藏单位", "description": "深邃的庇护所。在洞穴中隐藏单位，敌人无法攻击。"},
    {"word": "cliff", "meaning": "悬崖", "category": "B", "rarity": "Common", "effect": "坠落伤害", "description": "万丈深渊。将敌人推落悬崖造成即死或巨额伤害。"},
    {"word": "valley", "meaning": "山谷", "category": "B", "rarity": "Common", "effect": "地形收束", "description": "群山之隙。收束地形，迫使敌人集中通过狭窄通道。"},
    {"word": "sand", "meaning": "沙", "category": "B", "rarity": "Common", "effect": "减速与致盲", "description": "流沙之困。扬起沙尘，减速并有一定概率致盲敌人。"},
    {"word": "rock", "meaning": "岩石", "category": "B", "rarity": "Common", "effect": "放置障碍物", "description": "坚不可摧。放置一块岩石作为临时障碍物阻挡敌人。"},
    {"word": "tree", "meaning": "树", "category": "B", "rarity": "Common", "effect": "固定障碍物", "description": "参天之木。种下一棵树，随时间成长为坚固的天然障碍物。"},
    {"word": "leaf", "meaning": "叶子", "category": "B", "rarity": "Common", "effect": "伪装掩护", "description": "一叶障目。用叶片覆盖单位，使其与自然地形融为一体。"},
    {"word": "root", "meaning": "根", "category": "B", "rarity": "Common", "effect": "缠绕定身", "description": "地底之握。树根从地面钻出，缠绕并定身经过的敌人。"},
    {"word": "branch", "meaning": "树枝", "category": "B", "rarity": "Common", "effect": "横扫攻击", "description": "自然的鞭笞。挥舞树枝横扫前方扇形区域内的敌人。"},
    {"word": "grass", "meaning": "草", "category": "B", "rarity": "Common", "effect": "隐藏地面陷阱", "description": "草丛的掩护。在草丛中隐藏的陷阱更难被敌人发现。"},
    {"word": "vine", "meaning": "藤蔓", "category": "B", "rarity": "Common", "effect": "持续缠绕减速", "description": "蔓生之困。藤蔓持续生长，不断缠绕并减速接触的敌人。"},
    {"word": "thorn", "meaning": "荆棘", "category": "B", "rarity": "Common", "effect": "接触反伤", "description": "尖刺的守护。荆棘对接触到的敌人造成持续伤害。"},
    {"word": "moss", "meaning": "苔藓", "category": "B", "rarity": "Common", "effect": "地面滑行加速", "description": "湿滑之绿。在苔藓上友方单位移动速度提升。"},
    {"word": "bird", "meaning": "鸟", "category": "B", "rarity": "Common", "effect": "空中侦察", "description": "天空的使者。派遣飞鸟侦察前方战场，标记敌人位置。"},
    {"word": "fish", "meaning": "鱼", "category": "B", "rarity": "Common", "effect": "水中移动加速", "description": "水中的精灵。在水域中友方单位移动与攻击速度提升。"},
    {"word": "wolf", "meaning": "狼", "category": "B", "rarity": "Common", "effect": "召唤一只狼", "description": "荒野的猎手。召唤一只狼为你作战，狼群数量越多越强。"},
    {"word": "bear", "meaning": "熊", "category": "B", "rarity": "Rare", "effect": "召唤熊坦克", "description": "森林的巨兽。召唤一只熊作为前排坦克，血量极高。"},
    {"word": "snake", "meaning": "蛇", "category": "B", "rarity": "Common", "effect": "中毒DOT", "description": "隐秘的毒牙。攻击附带中毒效果，持续造成伤害。"},
    {"word": "fox", "meaning": "狐狸", "category": "B", "rarity": "Common", "effect": "高闪避骚扰", "description": "狡猾的精灵。召唤一只狐狸，拥有极高闪避率，适合骚扰敌人。"},
    {"word": "eagle", "meaning": "鹰", "category": "B", "rarity": "Rare", "effect": "俯冲攻击", "description": "苍穹的霸主。召唤雄鹰从高空俯冲攻击，造成高额暴击伤害。"},
    {"word": "bee", "meaning": "蜜蜂", "category": "B", "rarity": "Common", "effect": "蜂群干扰", "description": "勤劳的战士。释放蜂群干扰敌人，降低其攻击命中率。"},
    {"word": "wall", "meaning": "墙", "category": "C", "rarity": "Common", "effect": "建造基础墙壁", "description": "最基础的防线。建造一面墙壁阻挡敌人前进。"},
    {"word": "tower", "meaning": "塔", "category": "C", "rarity": "Common", "effect": "建造箭塔", "description": "高空的守望者。建造一座自动攻击的箭塔。"},
    {"word": "gate", "meaning": "大门", "category": "C", "rarity": "Common", "effect": "建造可控通道", "description": "进出的咽喉。建造一扇可开关的大门控制敌人通行。"},
    {"word": "fort", "meaning": "堡垒", "category": "C", "rarity": "Rare", "effect": "建造强化据点", "description": "坚固的营垒。建造一座堡垒，可在上面部署多个防御单位。"},
    {"word": "castle", "meaning": "城堡", "category": "C", "rarity": "Rare", "effect": "终极防御建筑", "description": "王国的象征。建造一座城堡，集防御、攻击、生产于一体。"},
    {"word": "shield", "meaning": "盾", "category": "C", "rarity": "Common", "effect": "临时护盾", "description": "守护的意志。为友方单位施加一个临时护盾吸收伤害。"},
    {"word": "guard", "meaning": "守卫", "category": "C", "rarity": "Common", "effect": "部署守卫单位", "description": "忠诚的守护者。部署一个守卫单位巡逻指定区域。"},
    {"word": "barrier", "meaning": "屏障", "category": "C", "rarity": "Rare", "effect": "能量屏障", "description": "透明的壁垒。建造一面能量屏障，阻挡敌人但不阻挡友方攻击。"},
    {"word": "fence", "meaning": "栅栏", "category": "C", "rarity": "Common", "effect": "建造廉价障碍", "description": "轻便的防线。建造栅栏，便宜且建造快，但耐久较低。"},
    {"word": "trench", "meaning": "战壕", "category": "C", "rarity": "Rare", "effect": "挖掘减速沟壑", "description": "大地的伤痕。挖掘一条战壕，坠入的敌人减速并受到伤害。"},
    {"word": "moat", "meaning": "护城河", "category": "C", "rarity": "Rare", "effect": "水域防线", "description": "环绕的守护。挖掘一条护城河，大幅减缓涉水敌人的速度。"},
    {"word": "bastion", "meaning": "棱堡", "category": "C", "rarity": "Epic", "effect": "多角度防御据点", "description": "星形要塞。建造一座棱堡，同时向多个方向射击。"},
    {"word": "sword", "meaning": "剑", "category": "C", "rarity": "Common", "effect": "近战攻击力+", "description": "百兵之君。装备后近战单位攻击力提升。"},
    {"word": "bow", "meaning": "弓", "category": "C", "rarity": "Common", "effect": "远程攻击力+", "description": "远程的利器。装备后远程单位攻击力与射程提升。"},
    {"word": "arrow", "meaning": "箭", "category": "C", "rarity": "Common", "effect": "弹药补充", "description": "飞行的锋芒。补充远程单位的弹药，增加攻击次数。"},
    {"word": "spear", "meaning": "矛", "category": "C", "rarity": "Common", "effect": "穿透攻击", "description": "穿刺之力。长矛攻击可穿透一条直线上的多个敌人。"},
    {"word": "axe", "meaning": "斧", "category": "C", "rarity": "Common", "effect": "破甲攻击", "description": "劈砍的暴力。斧头攻击无视敌人部分护甲。"},
    {"word": "hammer", "meaning": "锤", "category": "C", "rarity": "Common", "effect": "范围眩晕", "description": "雷霆一击。锤击地面造成范围伤害并有概率眩晕敌人。"},
    {"word": "armor", "meaning": "盔甲", "category": "C", "rarity": "Rare", "effect": "防御力+", "description": "钢铁的外壳。为友方单位装备盔甲，大幅提升防御力。"},
    {"word": "cannon", "meaning": "大炮", "category": "C", "rarity": "Rare", "effect": "远程AOE轰炸", "description": "火药的怒吼。建造一门大炮，对远处范围造成巨大伤害。"},
    {"word": "trap", "meaning": "陷阱", "category": "C", "rarity": "Common", "effect": "安放陷阱", "description": "地面的杀机。在指定位置安放一个触发式陷阱。"},
    {"word": "bomb", "meaning": "炸弹", "category": "C", "rarity": "Rare", "effect": "范围爆炸", "description": "毁灭的种子。投掷炸弹造成大范围爆炸伤害。"},
    {"word": "defend", "meaning": "防御", "category": "C", "rarity": "Common", "effect": "防御姿态", "description": "坚守阵地。命令单位进入防御姿态，提升防御降低移速。"},
    {"word": "attack", "meaning": "攻击", "category": "C", "rarity": "Common", "effect": "攻击指令", "description": "冲锋的号令。命令所有单位集火攻击指定目标。"},
    {"word": "protect", "meaning": "保护", "category": "C", "rarity": "Common", "effect": "护卫指定目标", "description": "舍身守护。命令一个单位保护指定目标，替其承受伤害。"},
    {"word": "patrol", "meaning": "巡逻", "category": "C", "rarity": "Common", "effect": "设定巡逻路线", "description": "警戒之眼。设定单位的巡逻路线，自动发现并攻击沿途敌人。"},
    {"word": "signal", "meaning": "信号", "category": "C", "rarity": "Common", "effect": "发送信号弹", "description": "烽火传讯。发射信号弹标记一个区域，所有友方优先攻击。"},
    {"word": "rally", "meaning": "集结", "category": "C", "rarity": "Rare", "effect": "召集所有单位", "description": "万军来朝。将所有可移动单位瞬间集结到指定位置。"},
    {"word": "victory", "meaning": "胜利", "category": "C", "rarity": "Rare", "effect": "Boss战时全属性+", "description": "必胜的信念。面对Boss时全属性大幅提升。"},
    {"word": "retreat", "meaning": "撤退", "category": "C", "rarity": "Common", "effect": "有序撤退", "description": "保存实力。命令单位有序撤退，撤退时移速提升且不受伤害。"},
    {"word": "treasure", "meaning": "宝藏", "category": "C", "rarity": "Rare", "effect": "获得大量金币", "description": "隐藏的财富。发现宝藏，一次性获得大量金币。"},
    {"word": "supply", "meaning": "补给", "category": "C", "rarity": "Common", "effect": "持续资源恢复", "description": "后勤生命线。建立补给线，持续恢复资源。"},
    {"word": "repair", "meaning": "修复", "category": "C", "rarity": "Common", "effect": "修理建筑", "description": "工匠的巧手。修复受损建筑，恢复其生命值。"},
    {"word": "forge", "meaning": "锻造", "category": "C", "rarity": "Rare", "effect": "升级装备", "description": "炉火纯青。在锻造台上升级单位的武器与装备。"},
    {"word": "anvil", "meaning": "铁砧", "category": "C", "rarity": "Rare", "effect": "强化金属单位", "description": "千锤百炼。在铁砧上强化金属类单位，提升其耐久。"},
    {"word": "magic", "meaning": "魔法", "category": "D", "rarity": "Common", "effect": "解锁法术系统", "description": "超凡之力。解锁魔法系统，可以使用法术攻击敌人。"},
    {"word": "spell", "meaning": "咒语", "category": "D", "rarity": "Common", "effect": "施放法术", "description": "言语的魔力。吟唱咒语施放法术，法术伤害基于收集的言灵数量。"},
    {"word": "enchant", "meaning": "附魔", "category": "D", "rarity": "Rare", "effect": "武器附魔", "description": "赋予灵魂。给武器附加元素属性，造成额外元素伤害。"},
    {"word": "curse", "meaning": "诅咒", "category": "D", "rarity": "Rare", "effect": "削弱敌人", "description": "恶意的低语。对敌人施加诅咒，降低其攻击与防御。"},
    {"word": "bless", "meaning": "祝福", "category": "D", "rarity": "Rare", "effect": "强化友方", "description": "神圣的恩赐。为友方单位施加祝福，提升全属性。"},
    {"word": "charm", "meaning": "魅惑", "category": "D", "rarity": "Rare", "effect": "控制敌人", "description": "迷人的魔力。魅惑一个敌人，使其暂时为你作战。"},
    {"word": "hex", "meaning": "妖术", "category": "D", "rarity": "Rare", "effect": "随机负面效果", "description": "诡谲之术。对敌人施加一个随机负面效果。"},
    {"word": "ward", "meaning": "结界", "category": "D", "rarity": "Rare", "effect": "防护区域", "description": "守护的领域。在指定区域布下结界，阻挡敌人进入。"},
    {"word": "portal", "meaning": "传送门", "category": "D", "rarity": "Epic", "effect": "双向传送", "description": "空间的裂隙。开启两扇相连的传送门，单位可瞬间往返。"},
    {"word": "gate", "meaning": "门", "category": "D", "rarity": "Rare", "effect": "开启异界之门", "description": "维度的通道。临时开启通往异界的大门，召唤强力单位。"},
    {"word": "ancient", "meaning": "古老的", "category": "D", "rarity": "Rare", "effect": "解锁古代科技", "description": "失落的文明。发现古代遗迹，解锁强大的古代科技。"},
    {"word": "rune", "meaning": "符文", "category": "D", "rarity": "Rare", "effect": "符文强化", "description": "刻印的力量。在建筑上刻下符文，赋予其特殊效果。"},
    {"word": "crystal", "meaning": "水晶", "category": "D", "rarity": "Rare", "effect": "能量储存", "description": "魔力的结晶。水晶可以储存多余的能量，在需要时释放。"},
    {"word": "energy", "meaning": "能量", "category": "D", "rarity": "Common", "effect": "能量回复+", "description": "万物的动力。提升能量回复速度，释放更多法术。"},
    {"word": "create", "meaning": "创造", "category": "D", "rarity": "Epic", "effect": "凭空造物", "description": "创世之力。消耗大量能量，在任意位置创造建筑或单位。"},
    {"word": "explore", "meaning": "探索", "category": "D", "rarity": "Common", "effect": "发现隐藏区域", "description": "未知的引力。探索战场，发现隐藏的资源与秘密区域。"},
    {"word": "discover", "meaning": "发现", "category": "D", "rarity": "Common", "effect": "揭示隐藏要素", "description": "慧眼识珠。发现战场上隐藏的宝藏、机关与秘密。"},
    {"word": "legend", "meaning": "传说", "category": "D", "rarity": "Epic", "effect": "解锁传说任务", "description": "口耳相传的神话。解锁特殊的传说级任务与奖励。"},
    {"word": "myth", "meaning": "神话", "category": "D", "rarity": "Epic", "effect": "召唤神话生物", "description": "诸神的故事。解锁召唤神话生物的能力。"},
    {"word": "prophecy", "meaning": "预言", "category": "D", "rarity": "Epic", "effect": "预知下一波敌人", "description": "未来的碎片。预知下一波敌人的类型与数量，提前布防。"},
    {"word": "alchemy", "meaning": "炼金术", "category": "D", "rarity": "Rare", "effect": "合成道具", "description": "转变的艺术。将基础材料合成为高级道具与药剂。"},
    {"word": "potion", "meaning": "药水", "category": "D", "rarity": "Common", "effect": "使用药水", "description": "瓶中的奥秘。使用药水产生各种即时效果。"},
    {"word": "elixir", "meaning": "灵药", "category": "D", "rarity": "Rare", "effect": "永久属性提升", "description": "长生之秘。使用灵药永久提升单位的某项属性。"},
    {"word": "essence", "meaning": "精华", "category": "D", "rarity": "Rare", "effect": "萃取敌人精华", "description": "万物的核心。击败敌人后萃取其精华，获得额外资源。"},
    {"word": "spirit", "meaning": "灵魂", "category": "D", "rarity": "Rare", "effect": "灵魂绑定", "description": "不灭的印记。将灵魂绑定到一个单位，使其阵亡后可免费复活一次。"},
    {"word": "shadow", "meaning": "暗影", "category": "D", "rarity": "Common", "effect": "暗影潜行", "description": "光明的背面。让单位融入暗影，完全隐身且移动加速。"},
    {"word": "light", "meaning": "光明", "category": "D", "rarity": "Common", "effect": "神圣伤害", "description": "净化的光芒。对暗影与亡灵敌人造成额外神圣伤害。"},
    {"word": "time", "meaning": "时间", "category": "D", "rarity": "Epic", "effect": "时间减速", "description": "第四维度。减缓时间流动，所有敌人动作变慢。"},
    {"word": "space", "meaning": "空间", "category": "D", "rarity": "Epic", "effect": "空间折叠", "description": "维度的扭曲。折叠空间，缩短敌人需要走过的距离。"},
    {"word": "void", "meaning": "虚空", "category": "D", "rarity": "Epic", "effect": "虚空吞噬", "description": "虚无的深渊。在指定位置打开虚空裂隙，吞噬范围内敌人。"},
    {"word": "memory", "meaning": "记忆", "category": "E", "rarity": "Legendary", "effect": "重温已通关卡", "description": "时光的刻痕。通过记忆回溯已完成的关卡，获得额外奖励。"},
    {"word": "dream", "meaning": "梦境", "category": "E", "rarity": "Legendary", "effect": "进入梦境挑战", "description": "意识之海。进入梦境世界，挑战特殊的梦境关卡。"},
    {"word": "hope", "meaning": "希望", "category": "E", "rarity": "Legendary", "effect": "绝境逆转", "description": "黑暗中的火种。基地生命低于10%时全属性翻倍，一次机会。"},
    {"word": "future", "meaning": "未来", "category": "E", "rarity": "Legendary", "effect": "解锁未来科技", "description": "尚未到来的时光。解锁未来科技树，获得超越时代的武器。"},
    {"word": "eternal", "meaning": "永恒", "category": "E", "rarity": "Legendary", "effect": "建筑永不磨损", "description": "不朽的承诺。指定建筑永恒存在，不再随时间损耗。"},
    {"word": "destiny", "meaning": "命运", "category": "E", "rarity": "Legendary", "effect": "改变随机结果", "description": "星辰的指引。可以改变一次命运——重置随机事件的结果。"},
    {"word": "fate", "meaning": "宿命", "category": "E", "rarity": "Legendary", "effect": "Boss终局技", "description": "无可逃避的结局。对Boss造成基于其已损失生命值的额外伤害。"},
    {"word": "freedom", "meaning": "自由", "category": "E", "rarity": "Legendary", "effect": "无视地形限制", "description": "无拘无束。所有单位短时间内无视地形限制自由移动。"},
    {"word": "justice", "meaning": "正义", "category": "E", "rarity": "Legendary", "effect": "对邪恶敌人伤害翻倍", "description": "审判的天平。对邪恶、暗影、亡灵类敌人造成双倍伤害。"},
    {"word": "sacrifice", "meaning": "牺牲", "category": "E", "rarity": "Legendary", "effect": "献祭一个单位换全屏增益", "description": "伟大的代价。牺牲一个友方单位，为全屏友方提供强力增益。"},
    {"word": "redemption", "meaning": "救赎", "category": "E", "rarity": "Legendary", "effect": "复活所有阵亡单位", "description": "最后的宽恕。一次性复活本关卡中所有阵亡的友方单位。"},
    {"word": "rebirth", "meaning": "重生", "category": "E", "rarity": "Legendary", "effect": "重置关卡状态", "description": "凤凰涅槃。将当前关卡重置为初始状态，但保留已收集的资源。"},
    {"word": "harmony", "meaning": "和谐", "category": "E", "rarity": "Legendary", "effect": "全属性平衡提升", "description": "万物共生的理想。当场上存在3种以上类型单位时全属性提升。"},
    {"word": "chaos", "meaning": "混沌", "category": "E", "rarity": "Legendary", "effect": "随机强力效果", "description": "原初的混乱。释放混沌之力，产生一个不可预测的强力效果。"},
    {"word": "infinity", "meaning": "无限", "category": "E", "rarity": "Legendary", "effect": "突破资源上限", "description": "无界之境。暂时突破所有资源存储上限，无限积累。"},
]


def get_stats():
    total = len(WORD_LIBRARY)
    categories = {}
    rarities = {}
    for w in WORD_LIBRARY:
        cat = w["category"]
        rar = w["rarity"]
        categories[cat] = categories.get(cat, 0) + 1
        rarities[rar] = rarities.get(rar, 0) + 1
    return total, categories, rarities


def get_words_by_category(category):
    return [w for w in WORD_LIBRARY if w["category"] == category]


def get_words_by_rarity(rarity):
    return [w for w in WORD_LIBRARY if w["rarity"] == rarity]


def search_word(keyword):
    results = []
    for w in WORD_LIBRARY:
        if keyword.lower() in w["word"].lower() or keyword in w["meaning"]:
            results.append(w)
    return results


if __name__ == "__main__":
    total, cats, rars = get_stats()
    print(f"言灵词典 - 共 {total} 个词汇")
    cat_names = {
        "A": "Basic Daily Words",
        "B": "Nature Words",
        "C": "Building & Defense",
        "D": "Magic & Civilization",
        "E": "Advanced Concept",
    }
    for cat in ["A", "B", "C", "D", "E"]:
        print(f"  {cat}. {cat_names[cat]}: {cats.get(cat, 0)} 个")
    rar_names = {
        "Common": "基础词",
        "Rare": "特殊功能词",
        "Epic": "高级言灵词",
        "Legendary": "世界观核心词",
    }
    for rar in ["Common", "Rare", "Epic", "Legendary"]:
        print(f"  {rar} ({rar_names[rar]}): {rars.get(rar, 0)} 个")
