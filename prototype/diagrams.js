/*  prototype/diagrams.js
 *  Pure data for the JS-driven BPMN viewer.
 *  Hand-transcribed from  Input/DRAWIO/Project Management.drawio  (7 diagrams).
 *
 *  Shape conventions (matching DRAWIO):
 *    - Activity: rounded 160×60, gradient #609EEB → #4690EB, white bold 11px
 *    - End marker: 30×30 blue ellipse
 *    - Edges: orthogonal #819BB0 1px, block arrowheads
 *
 *  Coordinate system: each diagram has its own grid. colWidths sum to canvas width.
 *  Activities are placed in cells addressed by (col, row), 0-indexed, and centered
 *  in their cell unless an optional `dx` (px offset from cell-left) is given — used
 *  when one swimlane cell holds two side-by-side activities, or to keep a vertical
 *  edge chain straight.
 *
 *  Edges use hand-transcribed JS-side IDs (e.g. "ip_e1"), NOT the raw mxCell
 *  strings from the DRAWIO. The raw XML ids are noted in comments next to each
 *  node/edge so a future editor can reconcile. Edges missing source= or target=
 *  in the DRAWIO are dropped per HANDOFF §5.1/§5.2 — no inferred / orphan edges
 *  are recorded here.
 */

const DIAGRAMS = {

  // ─────────────────────────────────────────────────────────────────────
  // DIAGRAM 1: Project Management (root)
  //   2 columns: Event | Project Team   |   9 body rows
  // ─────────────────────────────────────────────────────────────────────
  "8c69b0b21341": {
    key: "pm",
    title: "Project Management",
    columns: ["Event", "Project Team"],
    colWidths: [200, 220],   // total = 420
    headerHeight: 35,
    rowHeights: [120, 110, 120, 110, 110, 110, 120, 120, 150],
    nodes: [
      // row 0  — n_event (table_cell_1_1)
      { id: "n_event",          label: "Bidding",                  col: 1, row: 0, drillTo: null },
      // row 1  — JmBuxEZq01r6Q0BAOHDy-4 (col0) + n_init (col1)
      { id: "n_kickoff",        label: "Engineering Kick-Off",     col: 0, row: 1, drillTo: null },
      { id: "n_init",           label: "Initiate Project",         col: 1, row: 1, drillTo: "JDH2YTP4nvJb3EjhgnOv" },
      // row 2  — n_plan (UserObject link → R177_g8D3epj1Qdpr4Pk)
      { id: "n_plan",           label: "Plan Project",             col: 1, row: 2, drillTo: "R177_g8D3epj1Qdpr4Pk" },
      // row 3  — n_execute (UserObject link → CsMk0cfFSkTbZnF0cVsW)
      { id: "n_execute",        label: "Execute Project Delivery", col: 1, row: 3, drillTo: "CsMk0cfFSkTbZnF0cVsW" },
      // row 4  — n_monitor
      { id: "n_monitor",        label: "Monitor and Report",       col: 1, row: 4, drillTo: null },
      // row 5  — JmBuxEZq01r6Q0BAOHDy-6 (col0) + n_release (col1)
      { id: "n_probentry",      label: "Problem Entry",            col: 0, row: 5, drillTo: null },
      { id: "n_probmanagement", label: "Problem Management",       col: 1, row: 5, drillTo: null },
      // row 6  — n_inirel
      { id: "n_engrelease",     label: "Engineering Release",      col: 1, row: 6, drillTo: null },
      // row 7  — n_close
      { id: "n_warrenty",       label: "Warrenty",                 col: 1, row: 7, drillTo: null },
      // row 8  — n_end (ellipse)
      { id: "n_end",            label: "",                         col: 1, row: 8, kind: "ellipse" }
    ],
    edges: [
      // JmBuxEZq01r6Q0BAOHDy-5 (source=..-4 kickoff, target=n_init)
      { id: "e_ko_init", from: "n_kickoff", to: "n_init" }
      // e_kick_plan / e_app_execute / e_ini_signoff / e_sig_close — orphan
      // (each missing source OR target) → dropped per §5.2
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // DIAGRAM 2: Initiate Project
  //   3 columns: Event | EPM | SWPM   |   3 body rows
  //   Raw DRAWIO mxCell ids: 0AgJOyBHqVQeRlazFOzS-N (+ ldf189…, fp5Xh…, pzonky…)
  // ─────────────────────────────────────────────────────────────────────
  "JDH2YTP4nvJb3EjhgnOv": {
    key: "init",
    title: "Initiate Project",
    columns: ["Event", "EPM", "SWPM"],
    colWidths: [200, 200, 430],   // total = 830
    headerHeight: 35,
    rowHeights: [120, 110, 120],
    nodes: [
      // C5hUulT4j8OjQH1ZgRAj-1 — Engineering Kick-Off (col 0, row 0)
      { id: "ip_kickoff",   label: "Engineering Kick-Off",     col: 0, row: 0, drillTo: null },
      // 0AgJOyBHqVQeRlazFOzS-8 (UserObject link → w8Z1HQQmn1Q7hxVcatZq)
      { id: "ip_tsolution", label: "SW Technical Solution",    col: 2, row: 0, dx: 20, drillTo: "w8Z1HQQmn1Q7hxVcatZq" },
      // 0AgJOyBHqVQeRlazFOzS-12 (UserObject link → AAtk_UqaqViTv_qnk_qy)
      { id: "ip_swko",      label: "SW Engineering Kick-Off",  col: 2, row: 1, dx: 20, drillTo: "AAtk_UqaqViTv_qnk_qy" },
      // pzonky50LX5sK1_v7p0E-1 (<object> with attrs) — PTC Integrity (col 1, row 2)
      { id: "ip_ptc",       label: "PTC Integrity Project Creation", col: 1, row: 2, drillTo: null,
        attrs: {
          Responsible: "EPM",
          Support: "SWPM",
          External_Wiki_Link:
            "https://trw1.sharepoint.com/sites/CDAW1SWPMOfficialTeams/_layouts/Doc.aspx?sourcedoc={E1DD1EA4-F51B-4C1E-818D-F68F21B46420}&wd=target%28Tools.one%7C5824DFE4-5447-4F6E-8E9B-0ACA6343AA23%2FJenksin%5C%2FPipline%7C59C06597-4E52-4D90-971B-96B3E241324C%2F%29&wdpartid={D33C3F3E-97D6-462D-A8FF-AF1D6A417C92}{1}&wdsectionfileid={CFE580F9-DEE5-4890-BE19-2C3E26C7A7ED}&end"
            + "\n"
            + "onenote:https://trw1.sharepoint.com/sites/CDAW1SWPMOfficialTeams/Shared%20Documents/BRK%20Channel/BrakingSwPMKnowledgeBase/Tools.one#Jenksin/Pipline&section-id={5824DFE4-5447-4F6E-8E9B-0ACA6343AA23}&page-id={59C06597-4E52-4D90-971B-96B3E241324C}&end",
          Description: "Raise ticket to request ALM project creation"
        }
      },
      // 0AgJOyBHqVQeRlazFOzS-16 (UserObject link → CrMY9an8xEuoxMEgY2N7) — col 2, row 2 (left)
      { id: "ip_config",    label: "SW Configuration Setup",   col: 2, row: 2, dx: 20,  drillTo: "CrMY9an8xEuoxMEgY2N7" },
      // fp5XhZpfFITBFdjcFgNc-5 — SW ALM_Team Setup (col 2, row 2, right)
      { id: "ip_alm",       label: "SW ALM_Team Setup",        col: 2, row: 2, dx: 240, drillTo: null }
    ],
    edges: [
      // 0AgJOyBHqVQeRlazFOzS-21 (source=..-8, target=..-12)
      { id: "ip_e1", from: "ip_tsolution", to: "ip_swko" },
      // 0AgJOyBHqVQeRlazFOzS-22 (source=..-12, target=..-16)
      { id: "ip_e2", from: "ip_swko",      to: "ip_config" }
      // 0AgJOyBHqVQeRlazFOzS-17/18/19/20 — orphan (missing source or target) → dropped per §5.2
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // DIAGRAM 3: Plan Project (NEW)
  //   2 columns: Event | SWPM   |   3 body rows
  //   Raw DRAWIO mxCell ids: tPnXkk1UNrxAP7USdFhO-N
  // ─────────────────────────────────────────────────────────────────────
  "R177_g8D3epj1Qdpr4Pk": {
    key: "plan",
    title: "Plan Project",
    columns: ["Event", "SWPM"],
    colWidths: [210, 215],   // total = 425
    headerHeight: 35,
    rowHeights: [105, 120, 120],
    nodes: [
      // tPnXkk1UNrxAP7USdFhO-8 (col 0, row 0)
      { id: "pl_kickoff", label: "SW Engineering Kick-Off",   col: 0, row: 0, drillTo: null },
      // tPnXkk1UNrxAP7USdFhO-14 (col 1, row 1)
      { id: "pl_pmplan",  label: "SW Project Management Plan", col: 1, row: 1, drillTo: null },
      // tPnXkk1UNrxAP7USdFhO-20 (col 1, row 2)
      { id: "pl_unittest", label: "SW Unit Test Plan",        col: 1, row: 2, drillTo: null }
    ],
    edges: [
      // No <mxCell edge> in this diagram — 0 edges (§5.1)
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // DIAGRAM 4: Execute Project Delivery (NEW)
  //   4 columns: Event | Project Team | SWPM | SVM   |   6 body rows
  //   Raw DRAWIO mxCell ids: N4SzJBd1JQlqhdRm9OqY-N (+ Domiy…, YOKd…)
  // ─────────────────────────────────────────────────────────────────────
  "CsMk0cfFSkTbZnF0cVsW": {
    key: "execute",
    title: "Execute Project Delivery",
    columns: ["Event", "Project Team", "SWPM", "SVM"],
    colWidths: [210, 215, 215, 215],   // total = 855
    headerHeight: 35,
    rowHeights: [105, 120, 120, 130, 130, 130],
    nodes: [
      // N4SzJBd1JQlqhdRm9OqY-8 (col 0, row 0)
      { id: "ex_release",  label: "New Release Request",          col: 0, row: 0, drillTo: null },
      // N4SzJBd1JQlqhdRm9OqY-20 (col 1, row 0)
      { id: "ex_almsetup", label: "Delivery ALM Structure Setup", col: 1, row: 0, drillTo: null },
      // N4SzJBd1JQlqhdRm9OqY-14 (col 1, row 1)
      { id: "ex_content",  label: "Delivery Content Plan",        col: 1, row: 1, drillTo: null },
      // N4SzJBd1JQlqhdRm9OqY-24 (col 1, row 2)
      { id: "ex_change",   label: "Change Plan",                  col: 1, row: 2, drillTo: null },
      // DomiyGrIbkMBCTuWomwf-1 (col 1, row 3) — DRAWIO spelling "Chnage" kept verbatim
      { id: "ex_chgmgmt",  label: "Chnage Management",            col: 1, row: 3, drillTo: null },
      // DomiyGrIbkMBCTuWomwf-7 (col 2, row 4)
      { id: "ex_integ",    label: "SW Integration",               col: 2, row: 4, drillTo: null },
      // YOKdHpHOEfa-ve01PuLf-48 (col 3, row 5)
      { id: "ex_test",     label: "Test",                         col: 3, row: 5, drillTo: null }
    ],
    edges: [
      // No <mxCell edge> in this diagram — 0 edges (§5.1)
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // DIAGRAM 5: SW Engineering Kick-Off
  //   2 columns: Event | SWPM   |   4 body rows
  //   Raw DRAWIO mxCell ids: htcmtQhgqEFv2ou660lS-N
  //   NOTE: diagram ID changed (was oxGscgU2CmtkDHpKBtY4)
  // ─────────────────────────────────────────────────────────────────────
  "AAtk_UqaqViTv_qnk_qy": {
    key: "swko",
    title: "SW Engineering Kick-Off",
    columns: ["Event", "SWPM"],
    colWidths: [200, 220],
    headerHeight: 35,
    rowHeights: [120, 120, 110, 110],
    nodes: [
      // htcmtQhgqEFv2ou660lS-7 (UserObject link → w8Z1HQQmn1Q7hxVcatZq)
      { id: "swko_tsol", label: "SW Technical Solution",                col: 0, row: 0, drillTo: "w8Z1HQQmn1Q7hxVcatZq" },
      // htcmtQhgqEFv2ou660lS-12
      { id: "swko_pres", label: "SW Engineering Kick-Off Presentation", col: 1, row: 1, drillTo: null },
      // htcmtQhgqEFv2ou660lS-16
      { id: "swko_meet", label: "SW Engineering Kick-Off Meeting",      col: 1, row: 2, drillTo: null },
      // htcmtQhgqEFv2ou660lS-19 — end ellipse
      { id: "swko_end",  label: "",                                     col: 0, row: 3, kind: "ellipse" }
    ],
    edges: [
      // htcmtQhgqEFv2ou660lS-25 — tsol → pres
      { id: "swko_e1", from: "swko_tsol", to: "swko_pres" },
      // htcmtQhgqEFv2ou660lS-26 — pres → meet
      { id: "swko_e2", from: "swko_pres", to: "swko_meet" },
      // htcmtQhgqEFv2ou660lS-27 — meet → end ellipse
      { id: "swko_e3", from: "swko_meet", to: "swko_end" }
      // htcmtQhgqEFv2ou660lS-21/22/23/24 — orphan (missing source or target) → dropped per §5.2
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // DIAGRAM 6: SW Configuration Setup
  //   2 columns: Event | SWPM   |   2 body rows
  //   Raw DRAWIO mxCell ids: OIkXa_31-ZXwuiXeRIxq-N (+ Vc0iVrSIFqs3wgUCSNx2-1)
  // ─────────────────────────────────────────────────────────────────────
  "CrMY9an8xEuoxMEgY2N7": {
    key: "swconfig",
    title: "SW Configuration Setup",
    columns: ["Event", "SWPM"],
    colWidths: [200, 220],   // total = 420
    headerHeight: 35,
    rowHeights: [120, 110],
    nodes: [
      // OIkXa_31-ZXwuiXeRIxq-8 — plain mxCell, no link (col 0, row 0)
      { id: "sc_tsolution", label: "SW Technical Solution",     col: 0, row: 0, drillTo: null },
      // OIkXa_31-ZXwuiXeRIxq-20 (col 1, row 1)
      { id: "sc_baseline",  label: "SW Baseline Initiation CR", col: 1, row: 1, dx: 20, drillTo: null }
    ],
    edges: [
      // Vc0iVrSIFqs3wgUCSNx2-1 (source=--8, target=--20)
      { id: "sc_e1", from: "sc_tsolution", to: "sc_baseline" }
      // OIkXa_31-ZXwuiXeRIxq-21/22/23 — orphan (missing source AND target) → dropped per §5.2
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // DIAGRAM 7: SW Technical Solution
  //   3 columns: Event | SWPM | SW-LE   |   5 body rows
  //   Raw DRAWIO mxCell ids: PkeVM93K3rN9icCJVgIE-N
  // ─────────────────────────────────────────────────────────────────────
  "w8Z1HQQmn1Q7hxVcatZq": {
    key: "swts",
    title: "SW Technical Solution",
    columns: ["Event", "SWPM", "SW-LE: SW Lead Engineer"],
    colWidths: [210, 215, 215],   // total = 640
    headerHeight: 35,
    rowHeights: [105, 120, 120, 130, 130],
    nodes: [
      // PkeVM93K3rN9icCJVgIE-8 — "Engineering Kick-Off" (col 0, row 0)
      { id: "st_kickoff", label: "Engineering Kick-Off",                  col: 0, row: 0, drillTo: null },
      // PkeVM93K3rN9icCJVgIE-14 — "Prepare project change scope" (col 1, row 1)
      { id: "st_prep",    label: "Prepare project change scope",         col: 1, row: 1, drillTo: null },
      // PkeVM93K3rN9icCJVgIE-20 — "SW Technical Solution Prepare" (col 2, row 2)
      { id: "st_prepare", label: "SW Technical Solution Prepare",        col: 2, row: 2, drillTo: null },
      // PkeVM93K3rN9icCJVgIE-25 — "SW Technical Solution Review Meeting" (col 2, row 3)
      { id: "st_review",  label: "SW Technical Solution Review Meeting", col: 2, row: 3, drillTo: null },
      // PkeVM93K3rN9icCJVgIE-28 — end ellipse (col 0, row 4)
      { id: "st_end",     label: "",                                     col: 0, row: 4, kind: "ellipse" }
    ],
    edges: [
      // PkeVM93K3rN9icCJVgIE-31 — kickoff → prep
      { id: "st_e1", from: "st_kickoff", to: "st_prep" },
      // PkeVM93K3rN9icCJVgIE-32 — prep → prepare
      { id: "st_e2", from: "st_prep",    to: "st_prepare" },
      // PkeVM93K3rN9icCJVgIE-33 — prepare → review
      { id: "st_e3", from: "st_prepare", to: "st_review" },
      // PkeVM93K3rN9icCJVgIE-34 — review → end ellipse
      { id: "st_e4", from: "st_review",  to: "st_end" }
    ]
  }
};

// Tiny sanity check (silently asserts in console; no UI)
if (typeof window !== "undefined") {
  window.__DIAGRAMS = DIAGRAMS;
}
