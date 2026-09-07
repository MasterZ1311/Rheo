"use client";

import {Play, Youtube} from "lucide-react";

type Tutorial = {
	id: string;
	title: string;
	author: string;
	thumbnail: string;
};

const TUTORIALS: (Tutorial | null)[] = [
	{
		id: "sisnzgc73zc",
		title: "Free AI Voice Generator on Your PC (Clones Any Voice)",
		author: "Kevin Stratvert",
		thumbnail: "/rheo-logo-white.png",
	},
	{
		id: "woQe90k7g3c",
		title: "NEW Rheo DESTROYS ElevenLabs?",
		author: "Julian Goldie SEO",
		thumbnail: "/rheo-logo-white.png",
	},
	{
		id: "kqxqjRsdD5E",
		title: "This Open-Source TTS App Sounds Scary Good (And It's Free)",
		author: "Dave Swift",
		thumbnail: "/rheo-logo-white.png",
	},
	{
		id: "05YBqrWTLQ0",
		title: "2026年最好的声音克隆工具？Rheo完整测评：从下载到API调用，附速度对比",
		author: "Tech指南",
		thumbnail: "/rheo-logo-white.png",
	},
	{
		id: "RRRBxNXgeKQ",
		title: "Get Started with Rheo: Open-Source Alternative to ElevenLabs Tutorial",
		author: "StinkyScrublet",
		thumbnail: "/rheo-logo-white.png",
	},
	{
		id: "PyMx4L9mky4",
		title: "Free AI Voice Generator (Clones Any Voice)",
		author: "mikbes",
		thumbnail: "/rheo-logo-white.png",
	},
];

function TutorialCard({tutorial}: {tutorial: Tutorial}) {
	return (
		<a
			href={`https://www.youtube.com/watch?v=${tutorial.id}`}
			target="_blank"
			rel="noopener noreferrer"
			className="group rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden transition-all hover:border-white/30 hover:bg-white/[0.06]"
		>
			<div className="relative aspect-video overflow-hidden bg-black p-6 flex items-center justify-center">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={tutorial.thumbnail}
					alt={tutorial.title}
					className="h-20 w-20 object-contain transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
				/>
				{/* Play button overlay */}
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/20 transition-all group-hover:scale-110 group-hover:bg-white group-hover:text-black">
						<Play className="h-4 w-4 text-white group-hover:text-black fill-current ml-0.5" />
					</div>
				</div>
				{/* YouTube badge */}
				<div className="absolute top-3 right-3 flex items-center gap-1 rounded bg-black/60 backdrop-blur-sm px-2 py-1">
					<Youtube className="h-3 w-3 text-white" />
					<span className="text-[10px] font-medium text-white uppercase tracking-wider">
						YouTube
					</span>
				</div>
			</div>
			<div className="p-4">
				<h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug mb-1.5 group-hover:text-accent transition-colors">
					{tutorial.title}
				</h3>
				<p className="text-xs text-muted-foreground">{tutorial.author}</p>
			</div>
		</a>
	);
}

function TutorialPlaceholder() {
	return (
		<div className="rounded-xl border border-dashed border-border/60 bg-card/30 backdrop-blur-sm overflow-hidden">
			<div className="relative aspect-video overflow-hidden bg-gradient-to-br from-card via-muted/20 to-card">
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="flex h-14 w-14 items-center justify-center rounded-full border border-border/40 bg-card/40">
						<Play className="h-5 w-5 text-muted-foreground/40 fill-muted-foreground/40 ml-0.5" />
					</div>
				</div>
			</div>
			<div className="p-4">
				<div className="h-3 w-3/4 rounded bg-muted-foreground/10 mb-2" />
				<div className="h-2.5 w-1/3 rounded bg-muted-foreground/10" />
				<p className="text-[11px] text-muted-foreground/50 mt-3 uppercase tracking-wider">
					Coming soon
				</p>
			</div>
		</div>
	);
}

export function TutorialsSection() {
	return (
		<section id="tutorials" className="border-t border-border py-24">
			<div className="mx-auto max-w-6xl px-6">
				<div className="text-center mb-14">
					<div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur-sm px-3 py-1 mb-4">
						<Youtube className="h-3 w-3 text-accent" />
						<span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							Video tutorials
						</span>
					</div>
					<h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl mb-4">
						Learn by watching
					</h2>
					<p className="text-muted-foreground max-w-2xl mx-auto">
						Walkthroughs from the community covering setup, voice cloning, and
						production workflows.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
					{TUTORIALS.map((tutorial, i) =>
						tutorial ? (
							<TutorialCard key={tutorial.id} tutorial={tutorial} />
						) : (
							<TutorialPlaceholder key={`placeholder-${i}`} />
						),
					)}
				</div>
			</div>
		</section>
	);
}
