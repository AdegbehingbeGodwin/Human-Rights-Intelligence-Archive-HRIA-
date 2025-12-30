
import { DocumentEntry, Region } from './types';

export const APP_NAME = "Human Rights Archive Intelligence";
export const APP_SUBTITLE = "A document intelligence system for global human rights reporting";

// Fix type mismatch by explicitly defining MOCK_DOCUMENTS as an array of DocumentEntry and using the Region enum
export const MOCK_DOCUMENTS: DocumentEntry[] = [
  {
    id: "2023-AFR-001",
    title: "State of Human Rights in the Sahel Region",
    year: 2023,
    region: Region.AFRICA,
    institution: "UN Human Rights Council",
    abstract: "A comprehensive review of civil liberties and humanitarian challenges following recent political transitions in the Sahel region.",
    fullText: "The Sahel region has faced unprecedented challenges in the 2023 reporting period. Systematic reviews indicate a significant decline in the protection of journalists and human rights defenders. Military administrations in several territories have restricted freedom of assembly, citing security concerns as a primary justification. International observers have noted with concern the increasing reports of extrajudicial actions and the erosion of judicial independence. Community-led initiatives for peace remain the most viable path forward, yet they lack adequate institutional support from regional bodies..."
  },
  {
    id: "2022-GLO-012",
    title: "Global Trends in Digital Surveillance",
    year: 2022,
    region: Region.GLOBAL,
    institution: "Amnesty International",
    abstract: "Analyzing the intersection of national security legislation and individual privacy rights in the age of generative AI and predictive policing.",
    fullText: "Digital sovereignty and human rights are increasingly at odds as governments deploy advanced monitoring technologies. In 2022, the proliferation of invasive spyware was documented in over 45 countries, frequently targeting members of civil society. The report highlights the lack of robust international frameworks to govern the trade of dual-use surveillance technologies. Furthermore, the use of automated decision-making in criminal justice systems has introduced new vectors for systemic bias and discrimination against marginalized groups..."
  },
  {
    id: "2024-AME-005",
    title: "Indigenous Land Rights in the Amazon Basin",
    year: 2024,
    region: Region.AMERICAS,
    institution: "Inter-American Commission on Human Rights",
    abstract: "Ongoing violations of ancestral territory rights and the legal frameworks protecting environmental defenders in South America.",
    fullText: "The Amazon Basin remains a critical flashpoint for human rights and environmental justice. In the past year, encroachment by extractive industries has led to violent confrontations and the displacement of indigenous communities. Legal protections for land defenders are technically in place but suffer from chronic under-enforcement and a lack of political will. The Commission emphasizes that the protection of the Amazon is inextricably linked to the protection of those who have stewarded the land for generations..."
  }
];
