'use strict';

// [category, question, correct answer, [three wrong answers]]
const QUESTIONS = [
  // Geography
  ['Geography', 'What is the capital of Australia?', 'Canberra', ['Sydney', 'Melbourne', 'Perth']],
  ['Geography', 'Which is the longest river in Africa?', 'The Nile', ['The Congo', 'The Niger', 'The Zambezi']],
  ['Geography', 'Which is the smallest country in the world by area?', 'Vatican City', ['Monaco', 'San Marino', 'Liechtenstein']],
  ['Geography', 'Mount Kilimanjaro is located in which country?', 'Tanzania', ['Kenya', 'Uganda', 'Ethiopia']],
  ['Geography', 'Which is the largest hot desert in the world?', 'The Sahara', ['The Gobi', 'The Kalahari', 'The Arabian Desert']],
  ['Geography', 'What is the capital of Canada?', 'Ottawa', ['Toronto', 'Vancouver', 'Montreal']],
  ['Geography', 'Which strait separates Spain from Morocco?', 'Strait of Gibraltar', ['Bosphorus', 'Strait of Malacca', 'Strait of Hormuz']],
  ['Geography', 'Lake Titicaca lies on the border of Peru and which other country?', 'Bolivia', ['Chile', 'Ecuador', 'Argentina']],

  // Science
  ['Science', 'What is the chemical symbol for gold?', 'Au', ['Ag', 'Gd', 'Go']],
  ['Science', 'Which planet is known as the Red Planet?', 'Mars', ['Venus', 'Mercury', 'Jupiter']],
  ['Science', 'Roughly how fast does light travel in a vacuum?', '300,000 km per second', ['30,000 km per second', '3,000,000 km per second', '150,000 km per second']],
  ['Science', 'Which of these is the hardest natural substance?', 'Diamond', ['Quartz', 'Topaz', 'Corundum']],
  ['Science', 'How many bones does an adult human body have?', '206', ['212', '198', '226']],
  ['Science', 'Which gas makes up most of Earth\'s atmosphere?', 'Nitrogen', ['Oxygen', 'Carbon dioxide', 'Argon']],
  ['Science', 'Who developed the theory of general relativity?', 'Albert Einstein', ['Isaac Newton', 'Niels Bohr', 'Galileo Galilei']],
  ['Science', 'Which subatomic particle carries a negative electric charge?', 'Electron', ['Proton', 'Neutron', 'Photon']],

  // History
  ['History', 'In which year did the Berlin Wall fall?', '1989', ['1991', '1985', '1979']],
  ['History', 'Which of the Seven Wonders of the Ancient World still stands today?', 'The Great Pyramid of Giza', ['The Colossus of Rhodes', 'The Lighthouse of Alexandria', 'The Hanging Gardens of Babylon']],
  ['History', 'Who was the first person to walk on the Moon?', 'Neil Armstrong', ['Buzz Aldrin', 'Yuri Gagarin', 'Michael Collins']],
  ['History', 'Which civilisation built Machu Picchu?', 'The Inca', ['The Aztec', 'The Maya', 'The Olmec']],
  ['History', 'In which year was the Magna Carta sealed?', '1215', ['1066', '1315', '1415']],
  ['History', 'Who led India\'s non-violent campaign for independence from British rule?', 'Mahatma Gandhi', ['Jawaharlal Nehru', 'Subhas Chandra Bose', 'Sardar Patel']],
  ['History', 'In which country did the Renaissance begin?', 'Italy', ['France', 'Spain', 'Germany']],
  ['History', 'Which dynasty first unified China, in 221 BC?', 'Qin', ['Han', 'Ming', 'Tang']],

  // Arts & Culture
  ['Arts & Culture', 'Who painted the Mona Lisa?', 'Leonardo da Vinci', ['Michelangelo', 'Raphael', 'Botticelli']],
  ['Arts & Culture', 'Which country is the tango most closely associated with?', 'Argentina', ['Spain', 'Brazil', 'Cuba']],
  ['Arts & Culture', 'Who wrote Don Quixote?', 'Miguel de Cervantes', ['Lope de Vega', 'Gabriel García Márquez', 'Jorge Luis Borges']],
  ['Arts & Culture', 'In which Indian city is the Taj Mahal?', 'Agra', ['Delhi', 'Jaipur', 'Mumbai']],
  ['Arts & Culture', 'What is the Japanese art of paper folding called?', 'Origami', ['Ikebana', 'Kintsugi', 'Bonsai']],
  ['Arts & Culture', 'Which composer wrote The Four Seasons?', 'Antonio Vivaldi', ['Johann Sebastian Bach', 'Wolfgang Amadeus Mozart', 'George Frideric Handel']],
  ['Arts & Culture', 'The festival of Diwali is widely known as the festival of what?', 'Lights', ['Colours', 'Harvest', 'Kites']],
  ['Arts & Culture', 'Who wrote One Hundred Years of Solitude?', 'Gabriel García Márquez', ['Mario Vargas Llosa', 'Pablo Neruda', 'Isabel Allende']],

  // Sports
  ['Sports', 'How many players from one team are on the pitch in a football (soccer) match?', '11', ['9', '10', '12']],
  ['Sports', 'Which city hosted the 2016 Summer Olympics?', 'Rio de Janeiro', ['Beijing', 'London', 'Tokyo']],
  ['Sports', 'Which nation has won the most men\'s FIFA World Cups?', 'Brazil', ['Germany', 'Italy', 'Argentina']],
  ['Sports', 'Sumo wrestling is a traditional sport of which country?', 'Japan', ['South Korea', 'China', 'Mongolia']],
  ['Sports', 'In cricket, how many runs are scored when the ball crosses the boundary without bouncing?', 'Six', ['Four', 'Five', 'Eight']],
  ['Sports', 'How long is an official marathon?', '42.195 km', ['40 km', '45 km', '36.5 km']],
  ['Sports', 'Which sport is played with a shuttlecock?', 'Badminton', ['Squash', 'Table tennis', 'Lacrosse']],
  ['Sports', 'On which surface is the Wimbledon tennis championship played?', 'Grass', ['Clay', 'Hard court', 'Carpet']],

  // Technology
  ['Technology', 'What does HTML stand for?', 'HyperText Markup Language', ['High Text Machine Language', 'HyperTool Multi Language', 'Hyperlink Text Mode Language']],
  ['Technology', 'Who co-founded Microsoft with Paul Allen?', 'Bill Gates', ['Steve Jobs', 'Larry Page', 'Mark Zuckerberg']],
  ['Technology', 'What does CPU stand for?', 'Central Processing Unit', ['Computer Personal Unit', 'Central Program Utility', 'Core Processing Unit']],
  ['Technology', 'Which language is used to style web pages?', 'CSS', ['Python', 'SQL', 'Java']],
  ['Technology', 'Which company develops the Android operating system?', 'Google', ['Apple', 'Microsoft', 'Nokia']],
  ['Technology', 'What is the binary number 101 in decimal?', '5', ['3', '6', '7']],
  ['Technology', 'Which of these is a relational database?', 'PostgreSQL', ['MongoDB', 'Redis', 'Neo4j']],
  ['Technology', 'What does the "www" in a web address stand for?', 'World Wide Web', ['World Web Window', 'Wide Web Workspace', 'Web Wide World']],

  // Nature
  ['Nature', 'What is the largest animal on Earth?', 'Blue whale', ['African elephant', 'Sperm whale', 'Whale shark']],
  ['Nature', 'Which is the fastest land animal?', 'Cheetah', ['Lion', 'Pronghorn', 'Greyhound']],
  ['Nature', 'Which is the largest ocean?', 'Pacific Ocean', ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean']],
  ['Nature', 'How many hearts does an octopus have?', 'Three', ['One', 'Two', 'Four']],
  ['Nature', 'Which tree produces acorns?', 'Oak', ['Maple', 'Birch', 'Pine']],
  ['Nature', 'Most of the Amazon rainforest lies in which country?', 'Brazil', ['Peru', 'Colombia', 'Venezuela']],
  ['Nature', 'Which is the only mammal capable of true flight?', 'Bat', ['Flying squirrel', 'Colugo', 'Sugar glider']],
  ['Nature', 'Which is the largest coral reef system in the world?', 'The Great Barrier Reef', ['The Belize Barrier Reef', 'The Red Sea Reef', 'The Maldives Reef']],

  // Food & Drink
  ['Food & Drink', 'Which country is the paella dish from?', 'Spain', ['Italy', 'Portugal', 'Mexico']],
  ['Food & Drink', 'What is the main ingredient of guacamole?', 'Avocado', ['Tomato', 'Lime', 'Green pea']],
  ['Food & Drink', 'Kimchi is a traditional dish from which country?', 'Korea', ['Japan', 'China', 'Vietnam']],
  ['Food & Drink', 'Which spice is generally the most expensive by weight?', 'Saffron', ['Vanilla', 'Cardamom', 'Cinnamon']],
  ['Food & Drink', 'What is hummus mainly made from?', 'Chickpeas', ['Lentils', 'Fava beans', 'Black beans']],
  ['Food & Drink', 'Feijoada is widely regarded as the national dish of which country?', 'Brazil', ['Mexico', 'Argentina', 'Chile']],
  ['Food & Drink', 'Camembert cheese originates from which country?', 'France', ['Switzerland', 'Italy', 'The Netherlands']],
  ['Food & Drink', 'Which spirit is made from the fermented sap of the agave plant?', 'Tequila', ['Rum', 'Vodka', 'Sake']],
];
