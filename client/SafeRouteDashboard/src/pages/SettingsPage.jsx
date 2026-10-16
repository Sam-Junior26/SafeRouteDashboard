import React, { useState } from 'react';
import { LockKeyhole, LogOut, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requireSupabase } from '../lib/supabase';
import { ErrorBox, Field, PageTitle } from '../components/UI';
import { useNavigate } from 'react-router-dom';


export default function SettingsPage() {
    const { profile, signOut } = useAuth();

    const [name, setName] = useState(
        profile?.full_name || ""
    );
    const [email, setEmail] = useState(
        profile?.university_email || ""
    );
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const navigate = useNavigate();

    async function save(e) {
        e.preventDefault();

        setBusy(true);
        setError("");
        setMessage("");

        try {
            const db = requireSupabase();

            const { error } = await db
                .from("profiles")
                .update({
                    full_name: name.trim(),
                })
                .eq("id", profile.id);

            if (error) {
                throw error;
            }

            if (email.trim() !== profile.university_email) {
                throw new Error(
                    "Email changes are not enabled here. Use the approved Supabase Auth email-update workflow, then sync the profile."
                );
            }

            setMessage("Profile name updated.");
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function resetPassword() {
        setError("");
        setMessage("");

        try {
            const { error } = await requireSupabase().auth
                .resetPasswordForEmail(
                    profile.university_email,
                    {
                        redirectTo:
                            window.location.origin + "/login",
                    }
                );

            if (error) {
                throw error;
            }

            setMessage(
                "Password reset instructions have been sent if this email is eligible."
            );
        } catch (e) {
            setError(e.message);
        }
    }

    async function logout() {
        await signOut();
        navigate("/login");
    }

    return (
        <>
            <PageTitle
                title="Settings"
                subtitle="Manage your administrator profile and account security."
            />

            <ErrorBox error={error} />

            {message && (
                <div className="success-box">
                    {message}
                </div>
            )}

            <div className="settings-grid">
                <section className="panel settings-panel">
                    <div className="settings-section-title">
                        <span className="settings-icon">
                            <UserRound size={19} />
                        </span>

                        <div>
                            <h3>Administrator profile</h3>
                            <p>Basic account information</p>
                        </div>
                    </div>

                    <form
                        className="form-stack"
                        onSubmit={save}
                    >
                        <Field label="Full name">
                            <input
                                value={name}
                                onChange={(e) =>
                                    setName(e.target.value)
                                }
                                required
                            />
                        </Field>

                        <Field label="Email address">
                            <input
                                type="email"
                                value={email}
                                readOnly
                            />

                            <small className="field-help">
                                Email changes must be handled
                                through the approved
                                authentication workflow.
                            </small>
                        </Field>

                        <Field label="Role">
                            <input
                                value="Administrator"
                                readOnly
                            />
                        </Field>

                        <button
                            className="btn btn-primary"
                            disabled={busy}
                        >
                            <Save size={16} />
                            {busy
                                ? "Saving..."
                                : "Save profile"}
                        </button>
                    </form>
                </section>

                <section className="panel settings-panel">
                    <div className="settings-section-title">
                        <span className="settings-icon">
                            <LockKeyhole size={19} />
                        </span>

                        <div>
                            <h3>Account security</h3>
                            <p>
                                Protect access to the dashboard
                            </p>
                        </div>
                    </div>

                    <div className="security-setting">
                        <div>
                            <b>Password reset</b>
                            <p>
                                Receive an email with instructions
                                to reset your password.
                            </p>
                        </div>

                        <button
                            className="btn btn-secondary"
                            onClick={resetPassword}
                        >
                            Send reset email
                        </button>
                    </div>

                    <div className="security-setting">
                        <div>
                            <b>Administrator access</b>
                            <p>
                                Only active accounts with the
                                administrator role can use this
                                dashboard.
                            </p>
                        </div>

                        <ShieldCheck
                            size={21}
                            className="success-icon"
                        />
                    </div>

                    <div className="security-setting">
                        <div>
                            <b>Sign out</b>
                            <p>
                                End your current dashboard session
                                on this device.
                            </p>
                        </div>

                        <button
                            className="btn btn-danger-outline"
                            onClick={logout}
                        >
                            <LogOut size={16} />
                            Sign out
                        </button>
                    </div>
                </section>
            </div>

            <div className="notice">
                <ShieldCheck size={18} />

                <span>
                    Never share your password or place a
                    Supabase service-role key in frontend
                    environment variables.
                </span>
            </div>
        </>
    );
}