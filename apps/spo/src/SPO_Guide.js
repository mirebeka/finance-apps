import './SPO_Guide.css'
import { useEffect } from 'react';

function SPO_Guide() {
    useEffect(() => {
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';

        return () => {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        };
    }, []);


return (
        <div className="spo-guide-container">
            <h1>SPO Guide</h1>
            <div className="spo-guide-box">
                <div className="spo-guide-legend">

                    
                    <div className="spo-legend-item">
                        <span className="spo-legend-dot dot-red" />
                        <div className="spo-legend-text">
                        <div className="spo-legend-desc">Payment due date has passed (late invoice).</div>
                        </div>
                    </div>

                    <div className="spo-legend-item">
                        <span className="spo-legend-dot dot-yellow" />
                        <div className="spo-legend-text">
                        <div className="spo-legend-desc">Aging is between 0–10 days.</div>
                        </div>
                    </div>

                    <div className="spo-legend-item">
                        <span className="spo-legend-dot dot-green" />
                        <div className="spo-legend-text">
                        <div className="spo-legend-desc">Paid in SAP.</div>
                        </div>
                    </div>

                    <div className="spo-legend-item">
                        <span className="spo-legend-dot dot-grey" />
                        <div className="spo-legend-text">
                        <div className="spo-legend-desc">Invoice total is 0/CR.</div>
                        </div>
                    </div>

                        <div className="spo-legend-item">
                        <span className="spo-legend-dot dot-white" />
                        <div className="spo-legend-text">
                        <div className="spo-legend-desc">Invoice is missing from the invoice system, please check.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SPO_Guide;