import type { Dictionary, DictionaryChapter, Word } from '@/typings'

type BookChapterSource = {
  name: string
  text: string
}

const littlePrinceChapters: BookChapterSource[] = [
  {
    name: 'The Drawing No One Understood',
    text: `When I was six years old, I found a picture of a great snake swallowing a wild animal. The picture stayed in my mind, so I drew the snake from the outside. My drawing looked like a soft brown hat. I showed it to the grown-ups and asked whether it frightened them. They answered that a hat was not frightening at all.

I tried again. This time I drew the inside of the snake, with the animal resting in its round body. The grown-ups finally understood, but they told me to stop drawing. They said I should study numbers, maps, grammar, and history instead. I followed their advice and became a pilot.

Years later, I still tested people with my first drawing. Whenever someone called it a hat, I knew we would talk only about ordinary things. Then one day, after my airplane came down in a silent desert, I met a small traveler who looked at the drawing and understood it at once.`,
  },
  {
    name: 'A Visitor in the Desert',
    text: `The desert was empty in every direction. I had little water and only a few days to repair my airplane. At sunrise, a calm voice woke me. It asked, "Please draw me a sheep."

I sat up quickly. A small boy stood beside me. His clothes were unusual, but his face showed no fear. I drew several sheep, yet he rejected each one. One looked sick, another looked old, and another had horns. At last I drew a simple box with three small holes. I told him that the sheep he wanted was sleeping inside.

His face became bright. He studied the box and said the sheep was exactly right. Then he asked whether it would need much grass. From his questions, I slowly understood that his home was very small. He never answered directly when I asked where he came from. Instead, he watched my airplane with serious interest and laughed at the idea that I had fallen from the sky.`,
  },
  {
    name: 'The Little Planet',
    text: `The little traveler came from a planet hardly larger than a house. On his planet there were three volcanoes, a chair, a few flowers, and many dangerous seeds. Every morning he cleaned the volcanoes and pulled up young baobab trees before their roots could split the ground.

He explained that good habits matter most when a problem is still small. A seed can sleep quietly under the soil for a long time. When it wakes, it may become a rose or a weed. The trouble is that young baobabs look harmless. If someone waits too long, the work becomes impossible.

The little prince also loved sunsets. Because his planet was tiny, he only had to move his chair a few steps to watch the sun go down again. On one sad day, he watched forty-four sunsets. He did not explain why he was sad. I began to understand that his simple stories carried feelings he could not yet name.`,
  },
  {
    name: 'The Proud Rose',
    text: `One morning, a new flower opened on the little planet. She had prepared her colors slowly and arranged every petal with care. When she finally appeared, she asked for breakfast and complained about the cold. The little prince hurried to bring water and a glass cover.

The rose was beautiful, but her words often confused him. She wanted protection, praise, and attention, yet she hid her affection behind proud little speeches. The prince listened to what she said instead of noticing what she did. He became tired and began to doubt her.

Before leaving his planet, he cleaned the volcanoes and pulled the last baobab shoots. He watered the rose one final time. She did not blame him. In a quiet voice, she admitted that she loved him and asked him to go without the glass cover. Much later, the prince understood that he should have judged her by her fragrance, her light, and the care she brought into his days.`,
  },
  {
    name: 'People on Small Worlds',
    text: `The prince visited several small planets. On the first lived a king who wished to rule everything. The king gave only reasonable orders, but he still needed someone to obey him. On another planet, a proud man heard every sound as applause. He wanted admiration but never asked a real question.

The prince also met a businessman who counted stars and claimed to own them. He wrote numbers on paper and locked the paper away. The prince could not see how ownership helped the stars. Then he met a lamplighter who lit and put out a lamp every minute because his planet turned so quickly. The lamplighter was exhausted, yet he kept his promise.

Of all these people, the prince respected the lamplighter most. His work served something beyond himself. Still, the tiny planet had no room for two people, so the prince continued. Each visit made the world of grown-ups seem busier, stranger, and more lonely.`,
  },
  {
    name: 'The Geographer and Earth',
    text: `On a larger planet, the prince met a geographer surrounded by heavy books. The geographer recorded mountains, rivers, and oceans, but he never left his desk. He waited for explorers to bring him evidence. He called flowers temporary because they could disappear.

The word temporary troubled the prince. For the first time, he realized that his rose might not always be safe. He regretted leaving her alone with only four thorns. The geographer advised him to visit Earth, which had a good reputation among explorers.

Earth was larger than every world he had seen. At first, the prince landed in a desert and found no people. A snake spoke to him in riddles and promised that it could send anyone home. Later he climbed a mountain and called out, hoping for a friend. Only his own voice returned. He thought the planet was sharp, dry, and strangely empty, but his journey had only begun.`,
  },
  {
    name: 'The Fox and a Secret',
    text: `In a garden, the prince discovered thousands of roses. He had believed his own rose was unique, and the sight made him deeply unhappy. Then a fox appeared and asked the prince to tame him. The prince did not understand the word.

The fox explained that to tame someone is to create a bond. At first, they were strangers among thousands of strangers. With patience, regular meetings, and quiet attention, one life could become important to another. The prince returned at the same hour each day. Slowly, the fox learned to wait for the sound of his steps.

When it was time to leave, the fox was sad, but he did not regret their friendship. He gave the prince a secret: what matters most cannot be measured by appearance alone. Time and care make a person, a place, or a flower unique. The prince returned to the garden and understood that his rose mattered because he had watered her, listened to her, and protected her.`,
  },
  {
    name: 'A Star That Remembers',
    text: `In the desert, the prince and I searched for water. We walked beneath the stars until we found an old well. Its rope sang against the wheel, and the water tasted special because of the long walk, the night, and our shared hope.

My airplane was almost repaired, but the prince had reached the anniversary of his arrival on Earth. He wanted to return to his planet and care for his rose. His body was too heavy to carry across the stars, so he chose a difficult path that frightened me. He asked me to remember his laughter whenever I looked at the night sky.

Years have passed, yet the stars are different for me now. Somewhere among them is a small planet, a rose beneath a glass cover, and perhaps a sheep inside a box. When I listen carefully, the sky seems full of bells. I still wonder whether the sheep has eaten the flower. The answer changes the whole universe, even if grown-ups never understand why.`,
  },
]

function tokenizeBookChapters(chapters: BookChapterSource[]) {
  const words: Word[] = []
  const chapterMeta: DictionaryChapter[] = []

  chapters.forEach((chapter) => {
    chapterMeta.push({ name: chapter.name, start: words.length })
    chapter.text
      .trim()
      .split(/\n\s*\n/)
      .forEach((paragraph) => {
        paragraph
          .trim()
          .split(/\s+/)
          .forEach((token, index) => {
            const lookup = token.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '')
            words.push({
              name: token,
              lookup,
              paragraphStart: index === 0,
              trans: [],
              usphone: '',
              ukphone: '',
            })
          })
      })
  })

  return { words, chapterMeta }
}

const littlePrinceContent = tokenizeBookChapters(littlePrinceChapters)

export const books: Dictionary[] = [
  {
    id: 'book-the-little-prince',
    name: 'The Little Prince',
    subtitle: "A Learner's Retelling",
    author: 'Inspired by Antoine de Saint-Exupery',
    description: '面向英语打字练习的原创学习改写版，保留旅行、友谊与责任的主题。',
    category: '英文文学',
    tags: ['经典改写', '英语阅读'],
    url: 'book://the-little-prince',
    length: littlePrinceContent.words.length,
    language: 'en',
    languageCategory: 'en',
    contentType: 'book',
    chapters: littlePrinceContent.chapterMeta,
    chapterCount: littlePrinceContent.chapterMeta.length,
  },
]

export const idBookMap: Record<string, Dictionary> = Object.fromEntries(books.map((book) => [book.id, book]))

const bookWordsMap: Record<string, Word[]> = {
  'book-the-little-prince': littlePrinceContent.words,
}

export function getBookChapterWords(bookId: string, chapterIndex: number): Word[] {
  const book = idBookMap[bookId]
  const words = bookWordsMap[bookId]
  const chapter = book?.chapters?.[chapterIndex]
  if (!book || !words || !chapter) return []

  const end = book.chapters?.[chapterIndex + 1]?.start ?? words.length
  return words.slice(chapter.start, end)
}
