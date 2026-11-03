/**
 * 周报的模拟数据（周一到周日）。
 *
 * 今天那一天不用这里的数据 —— 用 journal.entries 实时算，
 * 这样刚记的一餐会立刻反映在周报里，数据和页面不会打架。
 *
 * 数值按「减脂期」的量级写（1200–1800），跟默认建议摄入 ~1330 对得上。
 * nutrition 顺序固定：[碳水, 蛋白质, 脂肪, 纤维, 糖, 盐]，单位 g
 */
export const weekReport = {
  /** 兜底值；实际展示用 store/body.js 算出来的动态目标 */
  goal: 1800,
  range: '10月26日 – 11月1日',
  days: [
    {
      date: 26,
      label: '一',
      kcal: 1420,
      nutrition: [168, 74, 46, 20, 22, 4.6],
      meals: ['番茄鸡蛋面', '酸奶全麦面包']
    },
    {
      date: 27,
      label: '二',
      kcal: 1380,
      nutrition: [162, 72, 42, 17, 25, 4.9],
      meals: ['咖喱饭', '苹果']
    },
    {
      date: 28,
      label: '三',
      kcal: 1290,
      nutrition: [150, 68, 38, 22, 16, 3.9],
      meals: ['牛肉面', '水煮青菜']
    },
    {
      date: 29,
      label: '四',
      kcal: 1680,
      nutrition: [192, 80, 58, 15, 32, 5.8],
      meals: ['黄焖鸡米饭', '奶茶']
    },
    {
      date: 30,
      label: '五',
      kcal: 0,
      nutrition: [0, 0, 0, 0, 0, 0],
      meals: []
    },
    {
      date: 31,
      label: '六',
      kcal: 1820,
      nutrition: [205, 84, 68, 14, 40, 6.4],
      meals: ['火锅', '蛋糕']
    },
    {
      date: 1,
      label: '日',
      kcal: 1310,
      nutrition: [148, 70, 40, 24, 17, 3.4],
      meals: ['沙拉', '拿铁']
    }
  ]
}

export const NUTRIENT_ORDER = ['碳水', '蛋白质', '脂肪', '纤维', '糖', '盐']
