"use client";

import { Activity, ArrowUpRight, Cpu, Download, Github, Mic, Play, ShieldCheck, Sparkles, Volume2, Wand2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { AgentIntegration } from "@/components/AgentIntegration";
import { ApiSection } from "@/components/ApiSection";
import { CaptureSection } from "@/components/CaptureSection";
import { ControlUI } from "@/components/ControlUI";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Personalities } from "@/components/Personalities";
import { AppleIcon, LinuxIcon, WindowsIcon } from "@/components/PlatformIcons";
import { SupportedModels } from "@/components/SupportedModels";
import { Testimonials } from "@/components/Testimonials";
import { TokenTeaser } from "@/components/TokenTeaser";
import { TutorialsSection } from "@/components/TutorialsSection";
import { VoiceCreator } from "@/components/VoiceCreator";
import { GITHUB_REPO, AUTHOR_GITHUB } from "@/lib/constants";

export default function Home() {
	const [version, setVersion] = useState<string | null>(null);
	const [totalDownloads, setTotalDownloads] = useState<number | null>(null);
	const [activeEngine, setActiveEngine] = useState<string>("qwen");
	const [isPlayingDemo, setIsPlayingDemo] = useState<boolean>(false);

	useEffect(() => {
		fetch("/api/releases")
			.then((res) => {
				if (!res.ok) throw new Error("Failed to fetch releases");
				return res.json();
			})
			.then((data) => {
				if (data.version) setVersion(data.version);
				if (data.totalDownloads != null) setTotalDownloads(data.totalDownloads);
			})
			.catch((error) => {
				console.error("Failed to fetch release info:", error);
			});
	}, []);

	return (
		<>
			<Navbar />

			{/* ── Asymmetric Cyber-Studio Hero Section ────────────────────────── */}
			<section className="relative pt-32 pb-20 overflow-hidden">
				{/* Ambient Studio Lighting Grid */}
				<div className="hero-glow pointer-events-none absolute inset-0 -top-40 overflow-hidden">
					<div className="absolute left-1/4 top-10 -translate-x-1/2 w-[700px] h-[550px] rounded-full bg-cyan-500/10 blur-[140px]" />
					<div className="absolute right-1/4 top-20 translate-x-1/2 w-[600px] h-[480px] rounded-full bg-purple-500/15 blur-[160px]" />
					<div className="absolute left-1/2 top-40 -translate-x-1/2 w-[900px] h-[300px] rounded-full bg-accent/10 blur-[130px]" />
				</div>

				<div className="relative mx-auto max-w-7xl px-6">
					{/* Dual-Column Asymmetric Grid */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
						{/* Left Column: Typography & CTAs */}
						<div className="lg:col-span-7 flex flex-col items-start text-left">
							{/* Origin & Provenance Pill */}
							<div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/30 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold tracking-wide text-cyan-300 mb-6 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
								<span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
								<span>RHEO v0.5 &middot; BY MASTERZ1311 &middot; APACHE 2.0</span>
							</div>

							{/* High-Impact Headline */}
							<h1 className="text-5xl font-extrabold tracking-tight leading-[1.02] text-foreground sm:text-6xl md:text-7xl">
								Sovereign Voice. <br />
								<span className="bg-gradient-to-r from-cyan-400 via-primary to-amber-300 bg-clip-text text-transparent">
									Zero-Latency Dictation.
								</span>{" "}
								<br />
								Infinite Speech.
							</h1>

							{/* Subtitle */}
							<p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
								Near-perfect neural voice cloning, multi-engine speech generation, and zero-latency system dictation with fuzzy dictionary correction. Runs{" "}
								<strong className="text-foreground font-semibold">100% locally on your machine</strong> under your complete sovereignty.
							</p>

							{/* Action Buttons Dock */}
							<div className="mt-8 flex flex-wrap items-center gap-4">
								<a
									href="#download"
									className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-cyan-500 via-accent to-amber-400 px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-slate-950 shadow-[0_4px_25px_rgba(6,182,212,0.35)] transition-all hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]"
								>
									<Download className="h-4 w-4 stroke-[2.5]" />
									Download Rheo
								</a>
								<a
									href={GITHUB_REPO}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 backdrop-blur-md px-6 py-3.5 text-sm font-medium text-foreground transition-all hover:bg-card hover:border-cyan-500/50"
								>
									<Github className="h-4 w-4" />
									GitHub
								</a>
								<a
									href={AUTHOR_GITHUB}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-cyan-400 transition-colors px-2 py-1"
								>
									<span>by masterz1311</span>
									<ArrowUpRight className="h-3 w-3" />
								</a>
							</div>

							{/* OS & Version Metadata */}
							<div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground/70">
								<span className="font-mono text-cyan-400/80">{version ?? "v0.5.0"}</span>
								<span>&middot;</span>
								<span>macOS (Apple Silicon/Intel)</span>
								<span>&middot;</span>
								<span>Windows 64-bit</span>
								<span>&middot;</span>
								<span>Linux</span>
							</div>
						</div>

						{/* Right Column: Interactive Holographic Rheo Studio Deck */}
						<div className="lg:col-span-5">
							<div className="relative rounded-3xl border border-white/10 bg-card/70 backdrop-blur-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_40px_rgba(6,182,212,0.1)]">
								{/* Deck Header */}
								<div className="flex items-center justify-between border-b border-border/50 pb-4 mb-5">
									<div className="flex items-center gap-2.5">
										<div className="h-3 w-3 rounded-full bg-cyan-400/80 animate-pulse" />
										<span className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
											Rheo Studio Engine
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
											100% OFFLINE
										</span>
										<span className="rounded-md bg-cyan-500/20 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
											&lt;12ms LATENCY
										</span>
									</div>
								</div>

								{/* Engine Selector Pills */}
								<div className="grid grid-cols-4 gap-1.5 mb-5 p-1 rounded-xl bg-black/40 border border-white/5">
									{[
										{ id: "qwen", label: "Qwen 4B" },
										{ id: "kokoro", label: "Kokoro" },
										{ id: "chatterbox", label: "ChatterBox" },
										{ id: "whisper", label: "Whisper STT" },
									].map((eng) => (
										<button
											key={eng.id}
											type="button"
											onClick={() => setActiveEngine(eng.id)}
											className={`rounded-lg py-1.5 text-center text-xs font-medium transition-all ${
												activeEngine === eng.id
													? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
													: "text-muted-foreground hover:text-foreground"
											}`}
										>
											{eng.label}
										</button>
									))}
								</div>

								{/* Animated Dynamic Oscilloscope Equalizer */}
								<div className="h-28 rounded-2xl bg-black/50 border border-white/5 p-4 flex items-end justify-between gap-1.5 mb-5 overflow-hidden relative">
									<div className="absolute top-2 left-3 font-mono text-[10px] text-muted-foreground/60 flex items-center gap-1.5">
										<Activity className="h-3 w-3 text-cyan-400" />
										<span>ACOUSTIC SPECTRUM &middot; 24kHz HIGH-RES</span>
									</div>
									{[42, 68, 30, 85, 95, 60, 48, 72, 88, 52, 65, 90, 78, 45, 82, 91, 58, 70, 84, 62].map((height, idx) => (
										<div
											key={idx}
											className="w-full rounded-full bg-gradient-to-t from-cyan-500 via-primary to-amber-300 transition-all duration-300"
											style={{
												height: isPlayingDemo
													? `${Math.max(15, (height * ((idx % 3) + 1)) % 100)}%`
													: `${height * 0.7}%`,
												opacity: 0.6 + (idx % 4) * 0.1,
											}}
										/>
									))}
								</div>

								{/* Voice Card Simulation with Interactive Play */}
								<div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between">
									<div className="flex items-center gap-3">
										<button
											type="button"
											onClick={() => setIsPlayingDemo(!isPlayingDemo)}
											className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-accent text-slate-950 shadow-md hover:scale-105 transition-transform"
											aria-label="Play sample"
										>
											<Play className="h-5 w-5 fill-current ml-0.5" />
										</button>
										<div>
											<div className="text-sm font-semibold text-foreground">
												Neural Voice: Sovereign Alpha
											</div>
											<div className="text-xs text-muted-foreground flex items-center gap-2">
												<span>Zero-shot prompt</span>
												<span>&middot;</span>
												<span className="text-cyan-400">Natural prosody</span>
											</div>
										</div>
									</div>
									<span className="font-mono text-xs text-cyan-300/80 bg-cyan-950/60 px-2 py-1 rounded-md border border-cyan-800/40">
										{isPlayingDemo ? "Playing..." : "Preview"}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* ── Bento Grid Matrix: Core Sovereign Capabilities ────────────── */}
					<div className="mt-24">
						<div className="text-center mb-12">
							<div className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-2">
								ARCHITECTURAL FOUNDATION
							</div>
							<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
								Engineered for Complete Vocal Autonomy
							</h2>
							<p className="mt-3 text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
								A comprehensive speech synthesis and dictation suite built from first principles for absolute local control.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							{/* Bento 1: Neural Voice Cloning */}
							<div className="rounded-3xl border border-white/10 bg-card/60 backdrop-blur-xl p-6 transition-all hover:border-cyan-500/40 hover:bg-card/80 group">
								<div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
									<Volume2 className="h-6 w-6" />
								</div>
								<h3 className="text-lg font-bold text-foreground mb-2">Neural Voice Cloning</h3>
								<p className="text-sm text-muted-foreground leading-relaxed">
									State-of-the-art zero-shot speaker cloning. Provide a 3-second audio sample and generate lifelike speech across 7 distinct TTS engines.
								</p>
							</div>

							{/* Bento 2: Zero-Latency Dictation & Vocabulary */}
							<div className="rounded-3xl border border-white/10 bg-card/60 backdrop-blur-xl p-6 transition-all hover:border-accent/40 hover:bg-card/80 group">
								<div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
									<Mic className="h-6 w-6" />
								</div>
								<h3 className="text-lg font-bold text-foreground mb-2">Instant Dictation & Dictionary</h3>
								<p className="text-sm text-muted-foreground leading-relaxed">
									Sub-millisecond rule-based disfluency removal ("um", "uh"), auto-submit key synthesis, and custom technical vocabulary fuzzy matching.
								</p>
							</div>

							{/* Bento 3: 100% Sovereign Offline Privacy */}
							<div className="rounded-3xl border border-white/10 bg-card/60 backdrop-blur-xl p-6 transition-all hover:border-purple-500/40 hover:bg-card/80 group">
								<div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5 group-hover:scale-110 transition-transform">
									<ShieldCheck className="h-6 w-6" />
								</div>
								<h3 className="text-lg font-bold text-foreground mb-2">100% Offline Privacy Shield</h3>
								<p className="text-sm text-muted-foreground leading-relaxed">
									Zero cloud telemetry. Your audio samples, database records, and neural model weights never leave your local hardware. Licensed under Apache 2.0.
								</p>
							</div>

							{/* Bento 4: Agent Speech & MCP Bridge */}
							<div className="rounded-3xl border border-white/10 bg-card/60 backdrop-blur-xl p-6 transition-all hover:border-emerald-500/40 hover:bg-card/80 group">
								<div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
									<Cpu className="h-6 w-6" />
								</div>
								<h3 className="text-lg font-bold text-foreground mb-2">Model Context Protocol (MCP)</h3>
								<p className="text-sm text-muted-foreground leading-relaxed">
									Native MCP audio gateway empowering Claude, OpenCode, and autonomous agents to speak directly in your customized cloned voices.
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* ── ControlUI Interactive Surface ───────────────────────────── */}
				<div className="mt-20">
					<ControlUI />
				</div>
			</section>

			{/* ── Features ─────────────────────────────────────────────── */}
			<Features />

			{/* ── Voice Creator ────────────────────────────────────────── */}
			<VoiceCreator />

			{/* ── Capture (dictation + STT + play as voice) ───────────── */}
			<CaptureSection />

			{/* ── Agent integration (speak primitive + MCP) ───────────── */}
			<AgentIntegration />

			{/* ── Personalities (Compose / Rewrite / Respond) ──────────── */}
			<Personalities />

			{/* ── API Section ──────────────────────────────────────────── */}
			<ApiSection />

			{/* ── Tutorials ────────────────────────────────────────────── */}
			<TutorialsSection />

			{/* ── Supported models ─────────────────────────────────────── */}
			<SupportedModels />

			{/* ── Testimonials ─────────────────────────────────────────── */}
			<Testimonials />

			{/* ── Download Section ─────────────────────────────────────── */}
			<section id="download" className="border-t border-border py-24">
				<div className="mx-auto max-w-4xl px-6">
					<div className="text-center mb-12">
						<h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl mb-4">
							Download Rheo
						</h2>
						<p className="text-muted-foreground">
							Sovereign voice synthesis for macOS, Windows, and Linux. No cloud dependencies required. Architected by masterz1311.
						</p>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
						{/* macOS ARM */}
						<a
							href="/download?platform=macArm"
							className="flex items-center rounded-xl border border-border bg-card/60 backdrop-blur-sm px-5 py-4 transition-all hover:border-accent/30 hover:bg-card group"
						>
							<AppleIcon className="h-6 w-6 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
							<div className="ml-4">
								<div className="text-sm font-medium">macOS</div>
								<div className="text-xs text-muted-foreground">
									Apple Silicon (ARM)
								</div>
							</div>
						</a>

						{/* macOS Intel */}
						<a
							href="/download?platform=macIntel"
							className="flex items-center rounded-xl border border-border bg-card/60 backdrop-blur-sm px-5 py-4 transition-all hover:border-accent/30 hover:bg-card group"
						>
							<AppleIcon className="h-6 w-6 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
							<div className="ml-4">
								<div className="text-sm font-medium">macOS</div>
								<div className="text-xs text-muted-foreground">Intel (x64)</div>
							</div>
						</a>

						{/* Windows */}
						<a
							href="/download?platform=windows"
							className="flex items-center rounded-xl border border-border bg-card/60 backdrop-blur-sm px-5 py-4 transition-all hover:border-accent/30 hover:bg-card group"
						>
							<WindowsIcon className="h-6 w-6 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
							<div className="ml-4">
								<div className="text-sm font-medium">Windows</div>
								<div className="text-xs text-muted-foreground">
									64-bit (MSI)
								</div>
							</div>
						</a>

						{/* Linux */}
						<a
							href="/linux-install"
							className="flex items-center rounded-xl border border-border bg-card/60 backdrop-blur-sm px-5 py-4 transition-all hover:border-accent/30 hover:bg-card group"
						>
							<LinuxIcon className="h-6 w-6 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
							<div className="ml-4">
								<div className="text-sm font-medium">Linux</div>
								<div className="text-xs text-muted-foreground">
									Build from source
								</div>
							</div>
						</a>
					</div>

					{/* GitHub link */}
					<div className="mt-6 text-center">
						<a
							href={`${GITHUB_REPO}/releases`}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							<Github className="h-4 w-4" />
							View all releases on GitHub
						</a>
					</div>
				</div>
			</section>

			{/* ── $RHEO token (teaser → /token) ─────────────────────── */}
			<TokenTeaser />

			{/* ── Footer ───────────────────────────────────────────────── */}
			<Footer />
		</>
	);
}
