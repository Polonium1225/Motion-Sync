
const Fonts = {
  weights: {
    thin: 'normal',      
    light: 'normal',     
    regular: 'normal',
    medium: 'bold',      
    bold: 'bold',
  },
  
  // Font sizes
  sizes: {
    xs: 10,
    small: 12,
    medium: 14,
    large: 16,
    xl: 18,
    xxl: 20,
    title: 24,
    header: 28,
  },
  
  // Helper functions
  getFont: (size = 'medium', weight = 'regular') => {
    return {
      fontSize: Fonts.sizes[size] || Fonts.sizes.medium,
      fontWeight: Fonts.weights[weight] || Fonts.weights.regular,
      fontFamily: undefined, 
    };
  },
};

export default Fonts;
