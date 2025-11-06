import { FeatureCollection } from 'geojson';
import * as ss from 'simple-statistics';
import { ChoroplethStyle, GraduatedStyle } from '../types/layer';

export interface ColorRamp {
  name: string;
  colors: string[];
}

export const COLOR_RAMPS: Record<string, ColorRamp> = {
  reds: {
    name: 'Reds',
    colors: ['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#99000d']
  },
  greens: {
    name: 'Greens',
    colors: ['#edf8e9', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#005a32']
  },
  blues: {
    name: 'Blues',
    colors: ['#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594']
  },
  oranges: {
    name: 'Oranges',
    colors: ['#feedde', '#fdd0a2', '#fdae6b', '#fd8d3c', '#f16913', '#d94801', '#8c2d04']
  },
  purples: {
    name: 'Purples',
    colors: ['#f2f0f7', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#4a1486']
  },
  viridis: {
    name: 'Viridis',
    colors: ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde724']
  },
  spectral: {
    name: 'Spectral',
    colors: ['#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd', '#5e4fa2'].reverse()
  },
  rdylgn: {
    name: 'RdYlGn',
    colors: ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641']
  }
};

export type ClassificationMethod = 'jenks' | 'quantile' | 'equal-interval' | 'standard-deviation';

export class StylingEngine {

  /**
   * Calculate Jenks Natural Breaks using Jenks-Fisher algorithm
   * This creates classes that minimize within-class variance and maximize between-class variance
   */
  private calculateJenksBreaks(values: number[], numClasses: number): number[] {
    if (values.length === 0) {
      throw new Error('Cannot calculate breaks for empty array');
    }

    if (numClasses >= values.length) {
      // If we want more classes than values, just return sorted unique values
      return [...new Set(values)].sort((a, b) => a - b);
    }

    const sorted = [...values].sort((a, b) => a - b);

    // Use simple-statistics for proper Jenks natural breaks
    try {
      const breaks = ss.ckmeans(sorted, numClasses);

      // Extract the maximum value of each cluster (break points)
      const breakPoints = breaks.map(cluster => Math.max(...cluster));

      return breakPoints;
    } catch (error) {
      console.warn('Jenks calculation failed, falling back to quantile', error);
      return this.calculateQuantileBreaks(sorted, numClasses);
    }
  }

  /**
   * Calculate Quantile breaks - each class has equal number of features
   */
  private calculateQuantileBreaks(values: number[], numClasses: number): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const breaks: number[] = [];

    for (let i = 1; i <= numClasses; i++) {
      const index = Math.ceil((sorted.length * i) / numClasses) - 1;
      breaks.push(sorted[Math.min(index, sorted.length - 1)]);
    }

    return breaks;
  }

  /**
   * Calculate Equal Interval breaks - classes have equal range
   */
  private calculateEqualIntervalBreaks(values: number[], numClasses: number): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const interval = (max - min) / numClasses;

    const breaks: number[] = [];
    for (let i = 1; i <= numClasses; i++) {
      breaks.push(min + (interval * i));
    }

    return breaks;
  }

  /**
   * Calculate Standard Deviation breaks
   */
  private calculateStandardDeviationBreaks(values: number[], numClasses: number): number[] {
    const mean = ss.mean(values);
    const stdDev = ss.standardDeviation(values);

    const breaks: number[] = [];
    const halfClasses = Math.floor(numClasses / 2);

    // Classes below mean
    for (let i = -halfClasses; i < 0; i++) {
      breaks.push(mean + (i * stdDev));
    }

    // Mean
    breaks.push(mean);

    // Classes above mean
    for (let i = 1; i <= halfClasses; i++) {
      breaks.push(mean + (i * stdDev));
    }

    // Ensure breaks are within data range
    const min = Math.min(...values);
    const max = Math.max(...values);

    return breaks
      .filter(b => b >= min && b <= max)
      .sort((a, b) => a - b);
  }

  /**
   * Calculate breaks using specified method
   */
  calculateBreaks(
    values: number[],
    numClasses: number,
    method: ClassificationMethod
  ): number[] {
    if (values.length === 0) {
      throw new Error('Cannot calculate breaks for empty array');
    }

    if (numClasses < 2) {
      throw new Error('Number of classes must be at least 2');
    }

    // Remove NaN and infinite values
    const cleanValues = values.filter(v => isFinite(v));

    if (cleanValues.length === 0) {
      throw new Error('No finite values in array');
    }

    switch (method) {
      case 'jenks':
        return this.calculateJenksBreaks(cleanValues, numClasses);
      case 'quantile':
        return this.calculateQuantileBreaks(cleanValues, numClasses);
      case 'equal-interval':
        return this.calculateEqualIntervalBreaks(cleanValues, numClasses);
      case 'standard-deviation':
        return this.calculateStandardDeviationBreaks(cleanValues, numClasses);
      default:
        throw new Error(`Unknown classification method: ${method}`);
    }
  }

  /**
   * Get colors from a color ramp, interpolating if necessary
   */
  getColors(rampName: string, numColors: number): string[] {
    const ramp = COLOR_RAMPS[rampName];
    if (!ramp) {
      throw new Error(`Unknown color ramp: ${rampName}`);
    }

    if (numColors <= ramp.colors.length) {
      // Sample evenly from the ramp
      const step = ramp.colors.length / numColors;
      const colors: string[] = [];
      for (let i = 0; i < numColors; i++) {
        const index = Math.floor(i * step);
        colors.push(ramp.colors[index]);
      }
      return colors;
    }

    // Need to interpolate - for now just repeat the ramp
    const colors: string[] = [];
    for (let i = 0; i < numColors; i++) {
      const index = i % ramp.colors.length;
      colors.push(ramp.colors[index]);
    }
    return colors;
  }

  /**
   * Create a choropleth style configuration
   */
  createChoroplethStyle(
    geojson: FeatureCollection,
    property: string,
    numClasses: number,
    method: ClassificationMethod,
    colorRamp: string
  ): ChoroplethStyle {
    // Extract values for the property
    const values: number[] = [];

    for (const feature of geojson.features) {
      if (feature.properties && property in feature.properties) {
        const value = feature.properties[property];
        if (typeof value === 'number' && isFinite(value)) {
          values.push(value);
        }
      }
    }

    if (values.length === 0) {
      throw new Error(`No valid numeric values found for property: ${property}`);
    }

    // Calculate breaks
    const breaks = this.calculateBreaks(values, numClasses, method);

    // Get colors
    const colors = this.getColors(colorRamp, numClasses);

    return {
      property,
      method,
      classes: numClasses,
      colorRamp: colorRamp as any,
      breaks,
      colors
    };
  }

  /**
   * Create a graduated symbols style configuration
   */
  createGraduatedStyle(
    geojson: FeatureCollection,
    property: string,
    minSize: number = 3,
    maxSize: number = 20
  ): GraduatedStyle {
    // Extract values
    const values: number[] = [];

    for (const feature of geojson.features) {
      if (feature.properties && property in feature.properties) {
        const value = feature.properties[property];
        if (typeof value === 'number' && isFinite(value)) {
          values.push(value);
        }
      }
    }

    if (values.length === 0) {
      throw new Error(`No valid numeric values found for property: ${property}`);
    }

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    return {
      property,
      minSize,
      maxSize,
      minValue,
      maxValue
    };
  }

  /**
   * Convert choropleth style to MapLibre expression
   */
  choroplethToExpression(style: ChoroplethStyle): any[] {
    const expression: any[] = ['case'];

    for (let i = 0; i < style.breaks.length; i++) {
      const breakValue = style.breaks[i];
      const color = style.colors[Math.min(i, style.colors.length - 1)];

      if (i === style.breaks.length - 1) {
        // Last class - less than or equal
        expression.push(['<=', ['get', style.property], breakValue]);
        expression.push(color);
      } else {
        // Other classes - less than
        expression.push(['<', ['get', style.property], breakValue]);
        expression.push(color);
      }
    }

    // Default color for values outside range or null
    expression.push('#cccccc');

    return expression;
  }

  /**
   * Convert graduated style to MapLibre expression
   */
  graduatedToExpression(style: GraduatedStyle): any[] {
    return [
      'interpolate',
      ['linear'],
      ['get', style.property],
      style.minValue, style.minSize,
      style.maxValue, style.maxSize
    ];
  }

  /**
   * Get numeric properties from a FeatureCollection
   */
  getNumericProperties(geojson: FeatureCollection): string[] {
    const numericProps = new Set<string>();

    for (const feature of geojson.features) {
      if (!feature.properties) continue;

      for (const [key, value] of Object.entries(feature.properties)) {
        if (typeof value === 'number' && isFinite(value)) {
          numericProps.add(key);
        }
      }
    }

    return Array.from(numericProps);
  }

  /**
   * Get statistics for a property
   */
  getPropertyStatistics(geojson: FeatureCollection, property: string) {
    const values: number[] = [];

    for (const feature of geojson.features) {
      if (feature.properties && property in feature.properties) {
        const value = feature.properties[property];
        if (typeof value === 'number' && isFinite(value)) {
          values.push(value);
        }
      }
    }

    if (values.length === 0) {
      return null;
    }

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: ss.mean(values),
      median: ss.median(values),
      stdDev: ss.standardDeviation(values),
      sum: ss.sum(values)
    };
  }
}
