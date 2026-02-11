
import React, { useState, useRef, MouseEvent as ReactMouseEvent, useCallback, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { LayoutElement, TableElement, DecoElement } from '../types';
import { useApp } from '../context/AppContext';

type DraggableItem = {
    id: string;
    offsetX: number;
    offsetY: number;
};

const ConstructorView: React.FC = () => {
    const { selectedRestaurantId } = useApp();
    const { getRestaurant, updateLayout } = useData();
    const restaurant = selectedRestaurantId ? getRestaurant(selectedRestaurantId) : null;

    const [elements, setElements] = useState<LayoutElement[]>([]);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const draggableRef = useRef<DraggableItem | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (restaurant?.layout) {
            setElements(restaurant.layout);
        }
    }, [restaurant]);

    const selectedElement = elements.find(el => el.id === selectedElementId);

    const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>, id: string) => {
        e.preventDefault();
        const targetElement = e.currentTarget;
        const rect = targetElement.getBoundingClientRect();
        
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        draggableRef.current = { id, offsetX, offsetY };
        setSelectedElementId(id);
    };

    const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
        if (!draggableRef.current || !canvasRef.current) return;
        
        const { id, offsetX, offsetY } = draggableRef.current;
        const canvasRect = canvasRef.current.getBoundingClientRect();

        let newX = e.clientX - canvasRect.left;
        let newY = e.clientY - canvasRect.top;
        
        setElements(prev => prev.map(el => el.id === id ? { ...el, x: newX - offsetX + (el.type === 'table' ? (el.shape === 'circle' ? 24: 28) : (el as DecoElement).width/2), y: newY - offsetY + (el.type === 'table' ? (el.shape === 'circle' ? 24: 28) : (el as DecoElement).height/2) } : el));
    }, []);

    const handleMouseUp = useCallback(() => {
        draggableRef.current = null;
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);
    
    const addElement = (type: 'table-square' | 'table-circle' | 'wall' | 'bar' | 'plant') => {
        const newId = `el-${Date.now()}`;
        let newElement: LayoutElement;
        
        if (type === 'table-square' || type === 'table-circle') {
            const tableCount = elements.filter(e => e.type === 'table').length;
            newElement = {
                id: newId,
                type: 'table',
                x: 100, y: 100,
                seats: 4,
                shape: type === 'table-square' ? 'square' : 'circle',
                label: (tableCount + 1).toString(),
            } as TableElement;
        } else {
             newElement = {
                id: newId,
                type: type,
                x: 100, y: 100,
                width: type === 'wall' ? 200 : (type === 'bar' ? 150 : 40),
                height: type === 'wall' ? 10 : (type === 'bar' ? 50 : 40),
            } as DecoElement;
        }
        setElements(prev => [...prev, newElement]);
    };
    
    const updateSelectedElement = (prop: string, value: any) => {
        if (!selectedElementId) return;
        setElements(prev => prev.map(el => el.id === selectedElementId ? { ...el, [prop]: value } : el));
    };

    const handleSaveLayout = () => {
        if (!selectedRestaurantId) return;
        updateLayout(selectedRestaurantId, elements);
        alert('Layout saved!');
    };

    if (!restaurant) {
        return <div className="text-center text-gray-400">Loading restaurant data...</div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 bg-brand-primary p-4 rounded-lg shadow-lg">
                <h3 className="font-bold text-xl mb-4">Toolbox</h3>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addElement('table-square')} className="bg-brand-accent p-3 rounded text-sm hover:bg-gray-600">Square Table</button>
                    <button onClick={() => addElement('table-circle')} className="bg-brand-accent p-3 rounded text-sm hover:bg-gray-600">Circle Table</button>
                    <button onClick={() => addElement('wall')} className="bg-brand-accent p-3 rounded text-sm hover:bg-gray-600">Wall</button>
                    <button onClick={() => addElement('bar')} className="bg-brand-accent p-3 rounded text-sm hover:bg-gray-600">Bar</button>
                    <button onClick={() => addElement('plant')} className="bg-brand-accent p-3 rounded text-sm hover:bg-gray-600">Plant</button>
                </div>
                {selectedElement && (
                    <div className="mt-6 border-t border-brand-accent pt-4">
                        <h4 className="font-bold text-lg mb-2">Properties</h4>
                        <div className="space-y-2 text-sm">
                           {selectedElement.type === 'table' && (
                               <>
                                <div><label>Label: <input type="text" value={(selectedElement as TableElement).label} onChange={e => updateSelectedElement('label', e.target.value)} className="w-full bg-brand-secondary p-1 rounded mt-1" /></label></div>
                                <div><label>Seats: <input type="number" value={(selectedElement as TableElement).seats} onChange={e => updateSelectedElement('seats', parseInt(e.target.value))} className="w-full bg-brand-secondary p-1 rounded mt-1" /></label></div>
                               </>
                           )}
                           {'width' in selectedElement && <div><label>Width: <input type="number" value={(selectedElement as DecoElement).width} onChange={e => updateSelectedElement('width', parseInt(e.target.value))} className="w-full bg-brand-secondary p-1 rounded mt-1" /></label></div>}
                           {'height' in selectedElement && <div><label>Height: <input type="number" value={(selectedElement as DecoElement).height} onChange={e => updateSelectedElement('height', parseInt(e.target.value))} className="w-full bg-brand-secondary p-1 rounded mt-1" /></label></div>}
                        </div>
                    </div>
                )}
                 <button onClick={handleSaveLayout} className="w-full bg-brand-blue text-white font-bold py-3 mt-8 rounded-lg hover:bg-blue-600 transition-colors">Save Layout</button>
            </div>
            <div className="lg:col-span-3">
                 <h2 className="text-2xl font-bold mb-4">Layout Constructor for {restaurant.name}</h2>
                 <div ref={canvasRef} className="w-full h-[600px] bg-brand-primary rounded-lg relative overflow-hidden border-2 border-brand-accent bg-grid">
                    {elements.map(el => {
                        const isSelected = el.id === selectedElementId;
                        const baseStyles = {
                            left: `${el.x}px`, top: `${el.y}px`,
                            boxShadow: isSelected ? '0 0 0 3px #4299e1' : 'none'
                        };

                        if (el.type === 'table') {
                            const shapeClasses = el.shape === 'circle' ? 'rounded-full w-12 h-12' : 'rounded-md w-14 h-14';
                            return <div key={el.id} style={baseStyles} onMouseDown={(e) => handleMouseDown(e, el.id)} className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-white bg-gray-500 cursor-move ${shapeClasses}`}>
                                {(el as TableElement).label}
                            </div>
                        } else {
                            const decoStyles: { [key: string]: string } = { wall: 'bg-gray-600', bar: 'bg-yellow-800', plant: 'bg-green-700 rounded-full' };
                             return <div key={el.id} onMouseDown={(e) => handleMouseDown(e, el.id)} style={{...baseStyles, width: `${(el as DecoElement).width}px`, height: `${(el as DecoElement).height}px`}} className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move ${decoStyles[el.type]}`} />;
                        }
                    })}
                </div>
            </div>
            <style>{`
                .bg-grid {
                    background-image: linear-gradient(to right, #2d3748 1px, transparent 1px), linear-gradient(to bottom, #2d3748 1px, transparent 1px);
                    background-size: 20px 20px;
                }
            `}</style>
        </div>
    );
};

export default ConstructorView;
