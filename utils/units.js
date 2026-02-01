// Unit conversion utilities
// Metric: grams (g)
// Imperial: ounces (oz)

export const UNIT_SYSTEMS = {
  METRIC: 'metric',
  IMPERIAL: 'imperial',
};

// Conversions
export const GRAMS_TO_OUNCES = 0.035274;
export const OUNCES_TO_GRAMS = 28.3495;

export const convertToMetric = (value, fromUnit) => {
  if (fromUnit === UNIT_SYSTEMS.IMPERIAL) {
    return value * OUNCES_TO_GRAMS;
  }
  return value;
};

export const convertToImperial = (value, fromUnit) => {
  if (fromUnit === UNIT_SYSTEMS.METRIC) {
    return value * GRAMS_TO_OUNCES;
  }
  return value;
};

export const formatValue = (value, unitSystem, decimals = 1, t = null) => {
  const unitLabel = getUnitLabel(unitSystem, t);
  return `${value.toFixed(decimals)}${unitLabel}`;
};

export const getUnitLabel = (unitSystem, t = null) => {
  if (t) {
    return unitSystem === UNIT_SYSTEMS.IMPERIAL ? t('common.ounce') : t('common.gram');
  }
  return unitSystem === UNIT_SYSTEMS.IMPERIAL ? 'oz' : 'g';
};

// Common items in both systems (foods first, then drinks)
export const COMMON_ITEMS = {
  metric: [
    { name: 'Piece of Dark Chocolate', sugar: 5 },
    { name: 'Chocolate Bar', sugar: 24 },
    { name: 'Candy Bar', sugar: 27 },
    { name: 'Ice Cream (1 cup)', sugar: 28 },
    { name: 'Cookie', sugar: 10 },
    { name: 'Donut', sugar: 15 },
    { name: 'Cake Slice', sugar: 35 },
    { name: 'Cupcake', sugar: 24 },
    { name: 'Muffin', sugar: 25 },
    { name: 'Soda (355ml)', sugar: 39 },
    { name: 'Sweetened Iced Tea (355ml)', sugar: 25 },
    { name: 'Energy Drink (237ml)', sugar: 27 },
  ],
  imperial: [
    { name: 'Piece of Dark Chocolate', sugar: 0.18 },
    { name: 'Chocolate Bar', sugar: 0.85 },
    { name: 'Candy Bar', sugar: 0.95 },
    { name: 'Ice Cream (1 cup)', sugar: 1.0 },
    { name: 'Cookie', sugar: 0.35 },
    { name: 'Donut', sugar: 0.5 },
    { name: 'Cake Slice', sugar: 1.2 },
    { name: 'Cupcake', sugar: 0.85 },
    { name: 'Muffin', sugar: 0.88 },
    { name: 'Soda (12oz)', sugar: 1.38 },
    { name: 'Sweetened Iced Tea (12oz)', sugar: 0.88 },
    { name: 'Energy Drink (8oz)', sugar: 0.95 },
  ],
};
