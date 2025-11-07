import { render, screen, fireEvent } from '@testing-library/react';
import BasemapSelector from '@/components/map/BasemapSelector';
import { getDefaultBasemap, BASEMAPS } from '@/lib/map/map-sources';

describe('BasemapSelector', () => {
  const mockOnChange = jest.fn();
  const defaultBasemap = getDefaultBasemap();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the current basemap label', () => {
    render(
      <BasemapSelector
        currentBasemap={defaultBasemap}
        onBasemapChange={mockOnChange}
      />
    );

    expect(screen.getByText(defaultBasemap.label)).toBeInTheDocument();
  });

  it('should show basemap options when clicked', () => {
    render(
      <BasemapSelector
        currentBasemap={defaultBasemap}
        onBasemapChange={mockOnChange}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Should show multiple basemap options
    const options = screen.getAllByRole('button');
    expect(options.length).toBeGreaterThan(1);
  });

  it('should call onBasemapChange when a basemap is selected', () => {
    render(
      <BasemapSelector
        currentBasemap={defaultBasemap}
        onBasemapChange={mockOnChange}
      />
    );

    // Open selector
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Find and click a different basemap
    const differentBasemap = BASEMAPS.find(b => b.id !== defaultBasemap.id);
    if (differentBasemap) {
      const option = screen.getByText(differentBasemap.label);
      fireEvent.click(option);

      expect(mockOnChange).toHaveBeenCalledWith(differentBasemap);
    }
  });

  it('should close dropdown after selecting a basemap', () => {
    render(
      <BasemapSelector
        currentBasemap={defaultBasemap}
        onBasemapChange={mockOnChange}
      />
    );

    // Open selector
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Select a basemap
    const differentBasemap = BASEMAPS.find(b => b.id !== defaultBasemap.id);
    if (differentBasemap) {
      const option = screen.getByText(differentBasemap.label);
      fireEvent.click(option);

      // Dropdown should close - fewer buttons visible
      const buttonsAfter = screen.getAllByRole('button');
      expect(buttonsAfter.length).toBe(1); // Only the main button
    }
  });

  it('should filter basemaps by category', () => {
    render(
      <BasemapSelector
        currentBasemap={defaultBasemap}
        onBasemapChange={mockOnChange}
      />
    );

    // Open selector
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Should show category labels
    expect(screen.getByText(/Street Maps/i) || screen.getByText(/Satellite/i)).toBeInTheDocument();
  });

  it('should display attribution information', () => {
    render(
      <BasemapSelector
        currentBasemap={defaultBasemap}
        onBasemapChange={mockOnChange}
      />
    );

    // Open selector
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Should show license info for at least one basemap
    const licenseElements = screen.queryAllByText(/CC-BY|ODbL|Free/i);
    expect(licenseElements.length).toBeGreaterThan(0);
  });
});
