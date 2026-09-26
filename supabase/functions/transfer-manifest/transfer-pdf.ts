import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

export type TransferRun = {
  transfer_name: string;
  direction: string;
  service_type: string | null;
  departure_at: string;
  pickup_location: string;
  destination: string;
  driver_name: string | null;
  driver_mobile: string | null;
  lead_traveller_name: string | null;
  lead_traveller_mobile: string | null;
  vehicle_details: string | null;
  capacity: number | null;
  status: string;
  attendee_notes: string | null;
  protocol_notes: string | null;
};

export type TransferPassenger = {
  passenger_name_snapshot: string;
  passenger_mobile_snapshot: string | null;
  pickup_override: string | null;
  passenger_notes: string | null;
  sort_order: number;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 44;
const NAVY = rgb(0.025, 0.094, 0.145);
const PURPLE = rgb(0.40, 0.13, 0.68);
const PALE = rgb(0.95, 0.97, 0.99);
const MID = rgb(0.38, 0.45, 0.56);
const LINE = rgb(0.82, 0.86, 0.91);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0.04, 0.09, 0.16);

const text = (value: unknown) => String(value ?? "")
  .replace(/[\u2010-\u2015\u2212]/g, "-")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/[^\x09\x0a\x0d\x20-\x7e\xA0-\xFF]/g, "")
  .trim();

const dateTime = (value: string) => new Intl.DateTimeFormat("en-GB", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
  hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
}).format(new Date(value));

function wrap(value: unknown, font: PDFFont, size: number, maxWidth: number) {
  const output: string[] = [];
  for (const paragraph of text(value).split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (!line || font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
      else { output.push(line); line = word; }
    }
    if (line) output.push(line);
  }
  return output;
}

function drawSnowflake(page: PDFPage, x: number, y: number, radius: number) {
  for (let arm = 0; arm < 6; arm += 1) {
    const angle = arm * Math.PI / 3;
    const endX = x + Math.cos(angle) * radius;
    const endY = y + Math.sin(angle) * radius;
    page.drawLine({ start:{ x, y }, end:{ x:endX, y:endY }, thickness:2.2, color:WHITE });
    for (const fraction of [0.58, 0.78]) {
      const branchX = x + Math.cos(angle) * radius * fraction;
      const branchY = y + Math.sin(angle) * radius * fraction;
      for (const offset of [-Math.PI / 4, Math.PI / 4]) {
        page.drawLine({ start:{ x:branchX, y:branchY }, end:{ x:branchX - Math.cos(angle + offset) * radius * 0.23, y:branchY - Math.sin(angle + offset) * radius * 0.23 }, thickness:1.5, color:WHITE });
      }
    }
  }
}

export async function createTransferManifestPdf(run: TransferRun, passengers: TransferPassenger[], eventYear: number, isTest = false) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(`${text(run.transfer_name)} - transfer manifest`);
  pdf.setAuthor("UKAF WSA Protocol");
  pdf.setSubject(`ISSSC ${eventYear} transfer manifest${isTest ? " - TEST" : ""}`);
  pdf.setCreator("UKAF WSA ISSSC Protocol");
  let page: PDFPage;
  let y = 0;

  const addPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x:0, y:PAGE_HEIGHT - 88, width:PAGE_WIDTH, height:88, color:NAVY });
    drawSnowflake(page, 68, PAGE_HEIGHT - 44, 24);
    page.drawText("UKAF WSA", { x:108, y:PAGE_HEIGHT - 39, font:bold, size:18, color:WHITE });
    page.drawText(`ISSSC ${eventYear}${isTest ? " - TEST" : ""} - PROTOCOL TRANSFER MANIFEST`, { x:108, y:PAGE_HEIGHT - 59, font:regular, size:9.5, color:WHITE });
    y = PAGE_HEIGHT - 122;
  };
  const ensure = (height: number) => { if (y - height < 58) addPage(); };
  addPage();

  page.drawText(text(run.transfer_name), { x:MARGIN, y, font:bold, size:24, color:NAVY });
  const status = text(run.status).toUpperCase();
  page.drawText(status, { x:PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(status,10), y:y + 4, font:bold, size:10, color:PURPLE });
  y -= 30;
  page.drawText(dateTime(run.departure_at), { x:MARGIN, y, font:regular, size:11, color:MID });
  y -= 28;

  const facts = [
    ["Route", `${text(run.pickup_location)} to ${text(run.destination)}`],
    ["Service", text(run.service_type || run.vehicle_details || "To be confirmed")],
    ["Driver", [run.driver_name, run.driver_mobile].filter(Boolean).map(text).join(" - ") || "To be confirmed"],
    ["Lead traveller", [run.lead_traveller_name, run.lead_traveller_mobile].filter(Boolean).map(text).join(" - ") || "To be confirmed"],
    ["Vehicle", text(run.vehicle_details || "To be confirmed")],
    ["Passengers", `${passengers.length}${run.capacity ? ` of ${run.capacity} places` : ""}`],
  ];
  const boxWidth = (PAGE_WIDTH - MARGIN * 2 - 12) / 2;
  facts.forEach(([label,value],index) => {
    const column = index % 2, row = Math.floor(index / 2);
    const x = MARGIN + column * (boxWidth + 12), top = y - row * 58;
    page.drawRectangle({ x, y:top - 48, width:boxWidth, height:48, color:PALE, borderColor:LINE, borderWidth:0.5 });
    page.drawText(label.toUpperCase(), { x:x + 10, y:top - 15, font:bold, size:7.5, color:PURPLE });
    const valueLines = wrap(value, regular, 9, boxWidth - 20).slice(0,2);
    valueLines.forEach((line,lineIndex) => page.drawText(line,{ x:x + 10, y:top - 31 - lineIndex * 11, font:regular, size:9, color:BLACK }));
  });
  y -= 188;

  page.drawText("PASSENGER MANIFEST", { x:MARGIN, y, font:bold, size:11, color:NAVY });
  y -= 13;
  const columns = { number:MARGIN, name:MARGIN + 32, mobile:MARGIN + 250, pickup:MARGIN + 365 };
  const drawHeader = () => {
    page.drawRectangle({ x:MARGIN, y:y - 22, width:PAGE_WIDTH - MARGIN * 2, height:24, color:NAVY });
    [["No.",columns.number],["Passenger",columns.name],["Mobile",columns.mobile],["Pickup / note",columns.pickup]].forEach(([label,x]) => page.drawText(String(label),{ x:Number(x) + 6, y:y - 13, font:bold, size:8, color:WHITE }));
    y -= 24;
  };
  drawHeader();
  passengers.forEach((passenger,index) => {
    const note = text(passenger.pickup_override || passenger.passenger_notes || "");
    const nameLines = wrap(passenger.passenger_name_snapshot,regular,8.5,205);
    const noteLines = wrap(note,regular,8,135);
    const rowHeight = Math.max(28,Math.max(nameLines.length,noteLines.length) * 11 + 10);
    if(y - rowHeight < 72){addPage();page.drawText("PASSENGER MANIFEST - CONTINUED",{x:MARGIN,y,font:bold,size:11,color:NAVY});y-=13;drawHeader();}
    if(index % 2 === 1)page.drawRectangle({x:MARGIN,y:y-rowHeight,width:PAGE_WIDTH-MARGIN*2,height:rowHeight,color:PALE});
    page.drawText(String(index+1),{x:columns.number+7,y:y-17,font:regular,size:8.5,color:BLACK});
    nameLines.forEach((line,lineIndex)=>page.drawText(line,{x:columns.name+6,y:y-17-lineIndex*11,font:regular,size:8.5,color:BLACK}));
    page.drawText(text(passenger.passenger_mobile_snapshot),{x:columns.mobile+6,y:y-17,font:regular,size:8,color:BLACK});
    noteLines.forEach((line,lineIndex)=>page.drawText(line,{x:columns.pickup+6,y:y-17-lineIndex*11,font:regular,size:8,color:BLACK}));
    page.drawLine({start:{x:MARGIN,y:y-rowHeight},end:{x:PAGE_WIDTH-MARGIN,y:y-rowHeight},thickness:0.5,color:LINE});
    y -= rowHeight;
  });

  const notes = [["ATTENDEE INFORMATION",run.attendee_notes],["PROTOCOL NOTES",run.protocol_notes]].filter(([,value]) => text(value));
  for(const [label,value] of notes){
    const lines=wrap(value,regular,9,PAGE_WIDTH-MARGIN*2-20),height=lines.length*12+34;ensure(height+10);
    y-=12;page.drawRectangle({x:MARGIN,y:y-height,width:PAGE_WIDTH-MARGIN*2,height,color:PALE});
    page.drawText(label,{x:MARGIN+10,y:y-16,font:bold,size:7.5,color:PURPLE});
    lines.forEach((line,index)=>page.drawText(line,{x:MARGIN+10,y:y-32-index*12,font:regular,size:9,color:BLACK}));y-=height;
  }

  const pages=pdf.getPages();
  pages.forEach((item,index)=>{
    const pageLabel=`Page ${index+1} of ${pages.length}`;
    item.drawText("Operational copy - verify against the live Event app before departure",{x:MARGIN,y:24,font:regular,size:7.5,color:MID});
    item.drawText(pageLabel,{x:PAGE_WIDTH-MARGIN-regular.widthOfTextAtSize(pageLabel,7.5),y:24,font:regular,size:7.5,color:MID});
  });
  return pdf.save({useObjectStreams:false});
}
