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
				<div className="relative mx-auto max-w-7xl px-6">
					{/* Dual-Column Asymmetric Grid */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
						{/* Left Column: Typography & CTAs */}
						<div className="lg:col-span-7 flex flex-col items-start text-left">
							{/* Origin & Provenance Pill */}
							<div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-zinc-200 mb-6">
								<span className="flex h-2 w-2 rounded-full bg-white motion-safe:animate-ping motion-reduce:hidden" />
								<span>Rheo (ῥέω)</span>
								<span className="h-3 w-px bg-white/20" />
								<span>Apache 2.0</span>
							</div>

							{/* High-Impact Headline */}
							<h1 className="text-5xl font-extrabold tracking-tight leading-[1.02] text-white sm:text-6xl md:text-7xl">
								Sovereign Voice. <br />
								<span className="text-zinc-200">Zero-Latency Dictation.</span> <br />
								Infinite Speech.
							</h1>

							{/* Subtitle */}
							<p className="mt-6 max-w-xl text-lg text-zinc-400 leading-relaxed">
								Sovereign voice cloning, multi-engine speech generation, and zero-latency local dictation.
							</p>

							{/* Action Buttons Dock */}
							<div className="mt-8 flex flex-wrap items-center gap-4">
								<a
									href="#download"
									className="inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.97]"
								>
									<Download className="h-4 w-4 stroke-[2.5]" />
									Download Rheo
								</a>
								<a
									href={GITHUB_REPO}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.05] px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/10 hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
								>
									<Github className="h-4 w-4" />
									GitHub
								</a>
								<a
									href={AUTHOR_GITHUB}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
								>
									<span>by masterz1311</span>
									<ArrowUpRight className="h-3 w-3" />
								</a>
							</div>

							{/* OS & Version Metadata */}
							<div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
								<span className="font-mono text-zinc-300">{version ?? "v0.1.0"}</span>
								<span className="h-3 w-px bg-white/10" />
								<span>macOS (Apple Silicon & Intel)</span>
								<span className="h-3 w-px bg-white/10" />
								<span>Windows 64-bit</span>
								<span className="h-3 w-px bg-white/10" />
								<span>Linux</span>
							</div>
						</div>

						{/* Right Column: Interactive Holographic Rheo Studio Deck */}
						<div className="lg:col-span-5">
							<div className="relative rounded-3xl border border-white/15 bg-zinc-950 p-6">
								{/* Deck Header */}
								<div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
									<div className="flex items-center gap-2.5">
										<div className="h-2.5 w-2.5 rounded-full bg-white motion-safe:animate-pulse" />
										<span className="text-xs font-semibold text-white">
											Rheo Studio Engine
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400">
											100% Offline
										</span>
										<span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white">
											&lt;12ms latency
										</span>
									</div>
								</div>

								{/* Engine Selector Pills */}
								<div className="grid grid-cols-4 gap-1.5 mb-5 p-1 rounded-xl bg-white/[0.03] border border-white/10">
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
											disabled={false}
											className={`rounded-lg py-1.5 text-center text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 ${
												activeEngine === eng.id
													? "bg-white text-black font-semibold shadow-sm"
													: "text-zinc-400 hover:text-white"
											}`}
										>
											{eng.label}
										</button>
									))}
								</div>

								{/* Animated Dynamic Oscilloscope Equalizer */}
								<div className="h-28 rounded-2xl bg-black border border-white/10 p-4 flex items-end justify-between gap-1.5 mb-5 overflow-hidden relative">
									<div className="absolute top-2 left-3 text-[11px] text-zinc-400 flex items-center gap-1.5">
										<Activity className="h-3 w-3 text-white" />
										<span>Acoustic spectrum (24kHz)</span>
									</div>
									{[42, 68, 30, 85, 95, 60, 48, 72, 88, 52, 65, 90, 78, 45, 82, 91, 58, 70, 84, 62].map((height, idx) => (
										<div
											key={idx}
											className="w-full h-full rounded-full bg-zinc-300 origin-bottom transition-transform duration-300"
											style={{
												transform: `scaleY(${
													isPlayingDemo
														? Math.max(0.15, ((height * ((idx % 3) + 1)) % 100) / 100)
														: (height * 0.7) / 100
												})`,
												opacity: 0.6 + (idx % 4) * 0.1,
											}}
										/>
									))}
								</div>

								{/* Voice Card Simulation with Interactive Play */}
								<div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 flex items-center justify-between">
									<div className="flex items-center gap-3">
										<button
											type="button"
											onClick={() => setIsPlayingDemo(!isPlayingDemo)}
											className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-md hover:bg-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
											aria-label="Play sample"
										>
											<Play className="h-5 w-5 fill-current ml-0.5" />
										</button>
										<div>
											<div className="text-sm font-semibold text-white">
												Neural Voice: Sovereign Alpha
											</div>
											<div className="text-xs text-zinc-400 flex items-center gap-2">
												<span>Zero-shot prompt</span>
												<span className="h-2.5 w-px bg-white/20" />
												<span className="text-zinc-300">Natural prosody</span>
											</div>
										</div>
									</div>
									<span className="font-mono text-xs text-white bg-white/10 px-2 py-1 rounded-md border border-white/20">
										{isPlayingDemo ? "Playing..." : "Preview"}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* ── Bento Grid Matrix: Core Sovereign Capabilities ────────────── */}
					<div className="mt-24">
						<div className="text-center mb-12">
							<h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
								Engineered for Complete Vocal Autonomy
							</h2>
							<p className="mt-3 text-zinc-400 max-w-xl mx-auto text-sm sm:text-base">
								A comprehensive speech synthesis and dictation suite built from first principles for absolute local control.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							{/* Bento 1: Neural Voice Cloning */}
							<div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 transition-colors hover:border-white/30 group">
								<div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white mb-5">
									<Volume2 className="h-6 w-6" />
								</div>
								<h3 className="text-lg font-bold text-white mb-2">Neural Voice Cloning</h3>
								<p className="text-sm text-zinc-400 leading-relaxed">
									State-of-the-art zero-shot speaker cloning. Provide a 3-second audio sample and generate lifelike speech across 7 distinct TTS engines.
								</p>
							</div>

							{/* Bento 2: Zero-Latency Dictation & Vocabulary */}
							<div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 transition-colors hover:border-white/30 group">
								<div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white mb-5">
									<Mic className="h-6 w-6" />
								</div>
								<h3 className="text-lg font-bold text-white mb-2">Instant Dictation & Dictionary</h3>
								<p className="text-sm text-zinc-400 leading-relaxed">
									Sub-millisecond rule-based disfluency removal, auto-submit key synthesis, and custom technical vocabulary fuzzy matching.
								</p>
							</div>

							{/* Bento 3: 100% Sovereign Offline Privacy */}
							<div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 transition-colors hover:border-white/30 group">
								<div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white mb-5">
									<ShieldCheck className="h-6 w-6" />
								</div>
								<h3 className="text-lg font-bold text-white mb-2">100% Offline Privacy Shield</h3>
								<p className="text-sm text-zinc-400 leading-relaxed">
									Zero cloud telemetry. Your audio samples, database records, and neural model weights never leave your local hardware. Licensed under Apache 2.0.
								</p>
							</div>

							{/* Bento 4: Agent Speech & MCP Bridge */}
							<div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 transition-colors hover:border-white/30 group">
								<div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white mb-5">
									<Cpu className="h-6 w-6" />
								</div>
								<h3 className="text-lg font-bold text-white mb-2">Model Context Protocol (MCP)</h3>
								<p className="text-sm text-zinc-400 leading-relaxed">
									Native MCP audio gateway enabling Claude, OpenCode, and autonomous agents to speak directly in your customized cloned voices.
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
							className="flex items-center rounded-xl border border-border bg-card/60 px-5 py-4 transition-colors hover:border-accent/30 hover:bg-card group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
							className="flex items-center rounded-xl border border-border bg-card/60 px-5 py-4 transition-colors hover:border-accent/30 hover:bg-card group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
							className="flex items-center rounded-xl border border-border bg-card/60 px-5 py-4 transition-colors hover:border-accent/30 hover:bg-card group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
							className="flex items-center rounded-xl border border-border bg-card/60 px-5 py-4 transition-colors hover:border-accent/30 hover:bg-card group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
							className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
						>
							<Github className="h-4 w-4" />
							View all releases on GitHub
						</a>
					</div>
				</div>
			</section>

			{/* ── Footer ───────────────────────────────────────────────── */}
			<Footer />
		</>
	);
}
