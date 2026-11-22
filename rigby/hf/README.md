---
license: cc-by-nc-4.0
pretty_name: Rigby Kinematic Motion Dataset
task_categories:
- robotics
language:
- en
tags:
- motion
- kinematics
- cross-embodiment
- motion-primitives
- mujoco
- llm-generated
size_categories:
- 1K<n<10K
configs:
- config_name: clips
  data_files: index/clips.jsonl
  default: true
- config_name: bodies
  data_files: index/bodies.jsonl
- config_name: primitives
  data_files: index/primitives.jsonl
- config_name: imported
  data_files: index/imported.jsonl
---

# Rigby kinematic motion dataset

3,938 motion clips for 36 robots (arms, quadrupeds, humanoids, hexapods, octopuses, wheeled bodies, a crane and animal-inspired robots). Every clip passes every physical check; takes that failed one were removed. Each robot's motion primitives were written by a language model from the robot's model alone and measured by forward kinematics; each skill clip is a program over those primitives, compiled to joint trajectories and checked frame by frame against a fixed set of physical constraints.

The clips are **kinematic**: poses, contacts and support are physically possible, but no dynamics were simulated.

In all the repository holds 4,049 motions on 43 robots, 7.6 hours: the 3,938 generated clips on 36 robots (6.5 hours) and 111 motions recorded in physics simulation on 18 animal-inspired robots, 11 of which also have generated clips and 7 of which (dolphin, jellyfish, manta ray, seahorse, shark, snake, tree-climbing snake) have recordings only. Statements that every clip passes every physical check are about the generated clips. See *Imported motions* below.

## At a glance

| | |
|---|---|
| Clips | 3,938: 635 skill, 153 task-blind, 3,150 procedural |
| Physical checks | every clip passes all of them, on every frame (joint limits, self-collision, floor penetration, planted-foot slip, support, reach, continuity, wheel slip) |
| Robots | 36 (4 held out for transfer tests) |
| Skills | 12 |
| Primitives | 548 modes, 87 gaits |
| Motion | 6.5 h at 50 fps |

## Robots

| Robot | Body plan | Joints | Source model | Licence of the model | Skill clips | Procedural |
|---|---|---|---|---|---|---|
| ANYmal C | quadruped | 12 | MuJoCo Menagerie | BSD-3-Clause | 34 | 150 |
| Apptronik Apollo | humanoid | 32 | MuJoCo Menagerie | Apache-2.0 | 32 | 150 |
| Booster T1 (held out) | humanoid | 23 | MuJoCo Menagerie | Apache-2.0 | 6 | 0 |
| Spot | quadruped | 12 | MuJoCo Menagerie | BSD-3-Clause | 37 | 150 |
| Franka Panda | arm | 16 | MuJoCo Menagerie | Apache-2.0 | 26 | 150 |
| Kinova Gen3 | arm | 14 | MuJoCo Menagerie | BSD-3-Clause | 26 | 150 |
| KUKA iiwa 14 (held out) | arm | 14 | MuJoCo Menagerie | BSD-3-Clause | 3 | 0 |
| Mobile crane (synthetic) | crane | 8 | synthetic (this repository) | CC BY-NC 4.0 (this dataset) | 31 | 150 |
| Dog with an arm (synthetic) | mobile_manipulator | 18 | synthetic (this repository) | CC BY-NC 4.0 (this dataset) | 37 | 150 |
| Octopus (synthetic) | octopus | 52 | synthetic (this repository) | CC BY-NC 4.0 (this dataset) | 38 | 150 |
| Wheeled biped (synthetic) | wheeled | 11 | synthetic (this repository) | CC BY-NC 4.0 (this dataset) | 24 | 150 |
| Random gripper 41 (synthetic) | arm | 15 | synthetic (this repository) | CC BY-NC 4.0 (this dataset) | 26 | 150 |
| Simple dog (synthetic) | quadruped | 12 | synthetic (this repository) | CC BY-NC 4.0 (this dataset) | 32 | 150 |
| xArm7 | arm | 20 | MuJoCo Menagerie | BSD-3-Clause | 26 | 150 |
| Unitree A1 | quadruped | 12 | MuJoCo Menagerie | BSD-3-Clause | 37 | 150 |
| Unitree G1 | humanoid | 29 | MuJoCo Menagerie | BSD-3-Clause | 38 | 150 |
| Unitree Go2 | quadruped | 12 | MuJoCo Menagerie | BSD-3-Clause | 37 | 150 |
| Unitree H1 | humanoid | 19 | MuJoCo Menagerie | BSD-3-Clause | 29 | 150 |
| UR5e | arm | 13 | MuJoCo Menagerie | BSD-3-Clause | 26 | 150 |
| Hexapod, new draw (synthetic) (held out) | multileg | 18 | synthetic (this repository) | CC BY-NC 4.0 (this dataset) | 6 | 0 |
| Hexapod (synthetic) | multileg | 18 | synthetic (this repository) | CC BY-NC 4.0 (this dataset) | 37 | 150 |
| Reverse-knee quadruped, new draw (synthetic) (held out) | quadruped | 12 | synthetic (this repository) | CC BY-NC 4.0 (this dataset) | 6 | 0 |
| Reverse-knee quadruped (synthetic) | quadruped | 12 | synthetic (this repository) | CC BY-NC 4.0 (this dataset) | 37 | 150 |
| Six-arm crawler (synthetic) | multileg | 24 | synthetic (this repository) | CC BY-NC 4.0 (this dataset) | 37 | 150 |
| Two-armed zoo body (synthetic) | dual_arm | 21 | synthetic (this repository) | CC BY-NC 4.0 (this dataset) | 26 | 150 |
| Tortoise (Aegis-T) | quadruped | 23 | Animal Atlas (Yi Zhou) | CC BY-NC 4.0 (this dataset) | 7 | 0 |
| Crocodile (Croco-X) | quadruped | 30 | Animal Atlas (Yi Zhou) | CC BY-NC 4.0 (this dataset) | 6 | 0 |
| Fox (Ember-F) | quadruped | 27 | Animal Atlas (Yi Zhou) | CC BY-NC 4.0 (this dataset) | 10 | 0 |
| Iguana (Ignea-I) | quadruped | 34 | Animal Atlas (Yi Zhou) | CC BY-NC 4.0 (this dataset) | 7 | 0 |
| Nine-tailed fox (Kitsune) | quadruped | 60 | Animal Atlas (Yi Zhou) | CC BY-NC 4.0 (this dataset) | 8 | 0 |
| Monkey (Simia-M) | quadruped | 56 | Animal Atlas (Yi Zhou) | CC BY-NC 4.0 (this dataset) | 12 | 0 |
| Octopus (Octo-8) | octopus | 100 | Animal Atlas (Yi Zhou) | CC BY-NC 4.0 (this dataset) | 10 | 0 |
| Praying mantis (Prism-M) | multileg | 30 | Animal Atlas (Yi Zhou) | CC BY-NC 4.0 (this dataset) | 9 | 0 |
| Salamander (Axon-S) | quadruped | 32 | Animal Atlas (Yi Zhou) | CC BY-NC 4.0 (this dataset) | 8 | 0 |
| Gecko (Vanta-L) | quadruped | 31 | Animal Atlas (Yi Zhou) | CC BY-NC 4.0 (this dataset) | 6 | 0 |
| Spider (Weaver-S) | multileg | 40 | Animal Atlas (Yi Zhou) | CC BY-NC 4.0 (this dataset) | 11 | 0 |

## Skills

Development skills (used while building the method) and frozen skills (written down in advance and first used for the pre-registered transfer test).

| Skill | Set | Clips | Pass the label check |
|---|---|---|---|
| wave | development | 69 | 26 |
| point | development | 66 | 46 |
| reach forward | development | 67 | 46 |
| crouch | development | 49 | 35 |
| turn in place | development | 43 | 34 |
| trace circle | development | 69 | 26 |
| bow | frozen | 38 | 7 |
| twist | frozen | 42 | 6 |
| kick swing | frozen | 49 | 1 |
| step forward | frozen | 41 | 33 |
| tap twice | frozen | 51 | 42 |
| lift and hold | frozen | 51 | 28 |

The label check is a strict, automatic test of each skill's definition.

## Imported motions: animal robots

111 motions for 18 animal-inspired robots that walk, climb and swim, designed and recorded by Yi Zhou (the Animal Atlas). They are a separate subset with a different guarantee from the clips above, and they are **not counted** in the numbers above.

- Each motion was recorded in MuJoCo physics, in its own scene: the robot, a floor and sometimes props, latches or approximate water forces. It was accepted on its author's physics validation, which the clip's record summarises.
- Each was made from a program over motion primitives by an earlier, physics-based executor of this project, not by the kinematic pipeline described below. Some are new compositions; others re-express a hand-written controller's motion as primitives.
- The dataset's kinematic checks were run on every one and are recorded, but they were not used to accept or reject it; 9 of 111 pass all of them. Checks such as static support and planted-foot slip do not fit swimming, climbing or jumping.
- Format: the same arrays as every clip (`qpos`, `qvel`, `tip_pos`, `contact`, `fps`), for the robot alone at 50 fps, in the qpos order of `bodies/<body>.xml`; plus `scene_t` and `scene_qpos`, the recording as it was made with every body of its scene, and the scene file.
- A robot whose joints changed between recordings has more than one model: `astral_<robot>`, then `_b` and `_c`. They are one robot; its rows in `index/imported.jsonl` share the same `robot`, and each row names the model its motion uses in `body`.
- Each clip's record (`imported/<body>/<task>.json`) says how its program was made (`made_with`: a new composition or a conversion, the executor, the scope of the author's validation) and links its interactive viewer in the author's gallery (`origin.page`).

| Robot | Body files | Motions | Minutes | Pass every kinematic check |
|---|---|---|---|---|
| KITSUNE / 09 / Nine-tailed fox | `astral_kitsune` | 6 | 4.4 | 3 |
| AEGIS–T / Tortoise | `astral_aegis_t`, `astral_aegis_t_b`, `astral_aegis_t_c` | 6 | 6.6 | 0 |
| EMBER–F / Fox | `astral_ember_f`, `astral_ember_f_b` | 6 | 4.5 | 2 |
| PRISM–M / Praying mantis | `astral_prism_m` | 6 | 5.3 | 3 |
| WEAVER–S / Spider | `astral_weaver_s` | 6 | 3.5 | 0 |
| SERPENS / Snake | `astral_serpens`, `astral_serpens_b` | 6 | 1.8 | 0 |
| SERPENS / ARBOR / Snake-inspired tree climber | `astral_serpens_arbor`, `astral_serpens_arbor_b`, `astral_serpens_arbor_c` | 6 | 2.7 | 0 |
| PELAGIC / MANTA / Manta Ray | `astral_manta_ray`, `astral_manta_ray_b`, `astral_manta_ray_c` | 6 | 3.2 | 0 |
| REEF / SHARK / Shark | `astral_shark`, `astral_shark_b` | 6 | 3.0 | 0 |
| ECHO / DOLPHIN / Dolphin | `astral_dolphin`, `astral_dolphin_b`, `astral_dolphin_c` | 6 | 3.5 | 0 |
| ANCHOR / SEAHORSE / Seahorse | `astral_seahorse`, `astral_seahorse_b`, `astral_seahorse_c` | 6 | 4.0 | 0 |
| AXON-S / Salamander | `astral_salamander`, `astral_salamander_b` | 6 | 1.5 | 0 |
| CROCO-X / Crocodile | `astral_crocodile`, `astral_crocodile_b` | 6 | 1.2 | 0 |
| IGNEA-I / Iguana | `astral_iguana` | 6 | 1.5 | 0 |
| OCTO-8 / Octopus | `astral_octopus` | 6 | 5.5 | 0 |
| SIMIA-M / Monkey | `astral_monkey` | 6 | 3.6 | 0 |
| MEDUSA-J / Jellyfish | `astral_jellyfish`, `astral_jellyfish_b` | 6 | 4.4 | 0 |
| VANTA–L / Chameleon / gecko | `astral_vanta_l`, `astral_vanta_l_b` | 9 | 5.0 | 1 |

11 of these robots are also in the main set above, with skill clips made by the kinematic pipeline (their rows in the robots table).

A robot with two body files uses two revisions of its model across its motions; each clip's record names its body file. The robots and motions are Yi Zhou's and are released under the same licence as the rest of the dataset.

## Files

```
index/clips.jsonl          one row per clip
index/bodies.jsonl         one row per robot
index/primitives.jsonl     one row per primitive (mode or gait)
bodies/<robot>.xml         MuJoCo model the clips are in (meshes replaced by primitive colliders)
bodies/<robot>.json        measured description: joints, tips, supports, size L and time scale T
primitives/<robot>.json    the robot's primitives library: modes, gaits, coverage, model, cost
clips/<robot>/<skill>_<arm>_v<k>.npz    skill and task-blind clips
clips/<robot>/<skill>_<arm>_v<k>.json   program, checks, label check, repair history, model calls
procedural/<robot>/<robot>__<kind>__<n>.npz/.json   clips made without a model
imported/<body>/<task>.npz        an imported motion (robot at 50 fps, and the scene's own recording)
imported/<body>/<task>.json       its record: origin, how it was made, author's validation, kinematic checks
imported/<body>/<task>.scene.xml  the scene it was recorded in
index/imported.jsonl              one row per imported motion
```

Each `.npz` holds `qpos` (frames x nq, the qpos order of `bodies/<robot>.xml`; a floating base comes first as position and quaternion w,x,y,z), `qvel`, `tip_pos` (frames x tips x 3, world frame, metres), `contact` (frames x contact edges, in the order of `contact_edges` in `bodies/<robot>.json`, 1 = touching) and `fps`.

`arm` is `P` for a program over the robot's primitives and `J` for a program of direct joint keyframes (the baseline). `taskblind` clips were asked for no task at all.

## Loading

```python
from huggingface_hub import snapshot_download
import json, numpy as np

root = snapshot_download("rigby-robotics/rigby-kinematic", repo_type="dataset",
    allow_patterns=["index/*", "bodies/unitree_go2.*", "clips/unitree_go2/*"])
rows = [json.loads(l) for l in open(f"{root}/index/clips.jsonl")]
go2 = [r for r in rows if r["body"] == "unitree_go2" and r["valid"]]
clip = np.load(f"{root}/{go2[0]['npz']}")
print(go2[0]["skill"], clip["qpos"].shape, clip["fps"])
```

Or `datasets.load_dataset("rigby-robotics/rigby-kinematic", "clips")` for the index alone.

To replay a clip in MuJoCo: load `bodies/<robot>.xml`, then set `data.qpos[:] = clip['qpos'][t]` and call `mj_forward` each frame.

## How it was made

1. **Intake.** Each robot model is reduced to a portable MuJoCo model with primitive colliders, and measured: joints, end effectors, supports (point feet, soles, wheels), a length scale L and a time scale T.
2. **Primitives.** A language model reads the measurements and proposes motion modes (joint directions with shares) and gaits (cycle and phase). Each is swept and measured by forward kinematics; invalid ones go back for up to two repair rounds; a coverage rule keeps a small set.
3. **Programs.** For each skill, the model writes a keyframe program over the primitives (arm P) or over raw joints (arm J).
4. **Compile and check.** A stance solver keeps planted feet, soles and wheels fixed and the centre of mass over the support; the clip is then checked frame by frame: joint limits, self-collision, floor penetration, planted-foot slip, support, IK misses, continuity and wheel slip. Failed checks go back to the model for up to two repairs.
5. **Procedural clips** (gait, balance, drive, random, object) are made directly from the primitives with no model call.

## Limitations

- Kinematic only: no forces, torques or dynamic balance were simulated.
- The label checks are strict and human-centric; a clip can do its skill and still fail them.
- One clip per (robot, skill, arm, variant); there is no motion-capture ground truth.

## Licence

The clips, programs, primitives, indexes, the synthetic robot models and the animal robot models are released under the [Creative Commons Attribution-NonCommercial 4.0 International licence](https://creativecommons.org/licenses/by-nc/4.0/) (CC BY-NC 4.0): free to use, share and adapt for non-commercial purposes, with credit to the authors.

**Commercial use:** please contact the authors by opening a discussion in the Community tab of this dataset.

The robot models in `bodies/` that are derived from MuJoCo Menagerie keep their own licences (table above; see `THIRD_PARTY.md`).
