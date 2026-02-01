// Localized food items - maps food keys to translation keys
// Foods first, then drinks
export const FOOD_KEYS = {
  metric: [
    { key: 'pieceOfDarkChocolate', sugar: 5 },
    { key: 'chocolateBar', sugar: 24 },
    { key: 'candyBar', sugar: 27 },
    { key: 'iceCream1cup', sugar: 28 },
    { key: 'cookie', sugar: 10 },
    { key: 'donut', sugar: 15 },
    { key: 'cakeSlice', sugar: 35 },
    { key: 'cupcake', sugar: 24 },
    { key: 'muffin', sugar: 25 },
    { key: 'soda355ml', sugar: 39 },
    { key: 'sweetenedIcedTea355ml', sugar: 25 },
    { key: 'energyDrink237ml', sugar: 27 },
  ],
  imperial: [
    { key: 'pieceOfDarkChocolate', sugar: 0.18 },
    { key: 'chocolateBar', sugar: 0.85 },
    { key: 'candyBar', sugar: 0.95 },
    { key: 'iceCream1cupOz', sugar: 1.0 },
    { key: 'cookie', sugar: 0.35 },
    { key: 'donut', sugar: 0.5 },
    { key: 'cakeSlice', sugar: 1.2 },
    { key: 'cupcake', sugar: 0.85 },
    { key: 'muffin', sugar: 0.88 },
    { key: 'soda12oz', sugar: 1.38 },
    { key: 'sweetenedIcedTea12oz', sugar: 0.88 },
    { key: 'energyDrink8oz', sugar: 0.95 },
  ],
};

export const getLocalizedFoodItems = (unitSystem, t) => {
  const mlUnit = t('common.milliliter');
  const ozUnit = t('common.ounce');
  
  return FOOD_KEYS[unitSystem].map(item => {
    let name = t(`foods.${item.key}`, { defaultValue: item.key });
    // Replace {{ml}} and {{oz}} placeholders with appropriate units
    name = name.replace(/\{\{ml\}\}/g, mlUnit);
    name = name.replace(/\{\{oz\}\}/g, ozUnit);
    return {
      name,
      sugar: item.sugar,
      key: item.key,
    };
  });
};
