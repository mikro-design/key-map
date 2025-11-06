import { render, screen, fireEvent } from '@testing-library/react';
import LayerPanel from '@/components/map/LayerPanel';

// Mock Map object
const mockMap = {
  setLayoutProperty: jest.fn(),
  setPaintProperty: jest.fn(),
  removeLayer: jest.fn(),
  removeSource: jest.fn(),
  getLayer: jest.fn(() => ({ id: 'test-layer' })),
};

describe('LayerPanel', () => {
  const mockOnLayersChange = jest.fn();
  const mockOnRemoveLayer = jest.fn();

  const sampleLayers = [
    {
      id: 'layer-1',
      name: 'Test Layer 1',
      type: 'vector' as const,
      visible: true,
      opacity: 0.8,
      geometryType: 'Point' as const,
      featureCount: 10,
      properties: ['name', 'value'],
      bounds: [0, 0, 10, 10] as [number, number, number, number],
    },
    {
      id: 'layer-2',
      name: 'Test Layer 2',
      type: 'vector' as const,
      visible: false,
      opacity: 1.0,
      geometryType: 'Polygon' as const,
      featureCount: 5,
      properties: ['area'],
      bounds: [0, 0, 10, 10] as [number, number, number, number],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render layer panel with layers', () => {
    render(
      <LayerPanel
        layers={sampleLayers}
        map={mockMap as any}
        onLayersChange={mockOnLayersChange}
        onRemoveLayer={mockOnRemoveLayer}
      />
    );

    expect(screen.getByText('Layers')).toBeInTheDocument();
    expect(screen.getByText('Test Layer 1')).toBeInTheDocument();
    expect(screen.getByText('Test Layer 2')).toBeInTheDocument();
  });

  it('should toggle layer visibility when checkbox is clicked', () => {
    render(
      <LayerPanel
        layers={sampleLayers}
        map={mockMap as any}
        onLayersChange={mockOnLayersChange}
        onRemoveLayer={mockOnRemoveLayer}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(mockOnLayersChange).toHaveBeenCalled();
    const updatedLayers = mockOnLayersChange.mock.calls[0][0];
    expect(updatedLayers[0].visible).toBe(false);
  });

  it('should update opacity when slider is changed', () => {
    render(
      <LayerPanel
        layers={sampleLayers}
        map={mockMap as any}
        onLayersChange={mockOnLayersChange}
        onRemoveLayer={mockOnRemoveLayer}
      />
    );

    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '0.5' } });

    expect(mockOnLayersChange).toHaveBeenCalled();
    const updatedLayers = mockOnLayersChange.mock.calls[0][0];
    expect(updatedLayers[0].opacity).toBe(0.5);
  });

  it('should remove layer when delete button is clicked', () => {
    render(
      <LayerPanel
        layers={sampleLayers}
        map={mockMap as any}
        onLayersChange={mockOnLayersChange}
        onRemoveLayer={mockOnRemoveLayer}
      />
    );

    const deleteButtons = screen.getAllByLabelText(/remove/i);
    fireEvent.click(deleteButtons[0]);

    expect(mockOnRemoveLayer).toHaveBeenCalledWith('layer-1');
  });

  it('should display feature count for each layer', () => {
    render(
      <LayerPanel
        layers={sampleLayers}
        map={mockMap as any}
        onLayersChange={mockOnLayersChange}
        onRemoveLayer={mockOnRemoveLayer}
      />
    );

    expect(screen.getByText(/10.*features?/i)).toBeInTheDocument();
    expect(screen.getByText(/5.*features?/i)).toBeInTheDocument();
  });

  it('should show empty state when no layers', () => {
    render(
      <LayerPanel
        layers={[]}
        map={mockMap as any}
        onLayersChange={mockOnLayersChange}
        onRemoveLayer={mockOnRemoveLayer}
      />
    );

    expect(screen.getByText(/no layers/i)).toBeInTheDocument();
  });

  it('should display geometry type for each layer', () => {
    render(
      <LayerPanel
        layers={sampleLayers}
        map={mockMap as any}
        onLayersChange={mockOnLayersChange}
        onRemoveLayer={mockOnRemoveLayer}
      />
    );

    expect(screen.getByText(/Point/i)).toBeInTheDocument();
    expect(screen.getByText(/Polygon/i)).toBeInTheDocument();
  });
});
