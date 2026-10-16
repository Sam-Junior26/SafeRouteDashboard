import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { PageTitle } from '../components/UI';


export default function SOSAlertsPage() {
    return (
        <>
            <PageTitle
                title="SOS monitoring"
                subtitle="Administrative monitoring of explicitly escalated emergency alerts."
            />

            <section className="panel sos-gate">
                <div className="sos-gate-icon">
                    <ShieldAlert size={28} />
                </div>

                <h2>SOS monitoring is not enabled</h2>

                <p>
                    The current database schema contains an{" "}
                    <code>emergency_alerts</code> table, but it
                    does not identify which alerts have been
                    explicitly escalated for university
                    administrator monitoring.
                </p>

                <p>
                    For privacy, private trusted-contact or
                    Circle alerts must not automatically appear
                    here. Add an approved escalation mechanism
                    and matching Row Level Security policies
                    before displaying live SOS records.
                </p>

                <div className="notice">
                    <ShieldAlert size={18} />

                    <span>
                        Do not treat a dashboard update as
                        confirmation that emergency assistance
                        has arrived.
                    </span>
                </div>
            </section>
        </>
    );
}