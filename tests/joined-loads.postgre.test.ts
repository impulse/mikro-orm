import { LoadStrategy, Logger, MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { initORMPostgreSql, wipeDatabasePostgreSql } from './bootstrap';
import { Author2, Book2 } from './entities-sql';

describe('Joined loading', () => {

  let orm: MikroORM<PostgreSqlDriver>;

  beforeAll(async () => orm = await initORMPostgreSql());
  beforeEach(async () => wipeDatabasePostgreSql(orm.em));

  afterAll(async () => orm.close(true));

  test('populate OneToMany with joined strategy [findOne()]', async () => {
    const author2 = new Author2('Albert Camus', 'albert.camus@email.com');
    const stranger = new Book2('The Stranger', author2);
    const fall = new Book2('The Fall', author2);
    author2.books2.add(stranger, fall);
    await orm.em.persistAndFlush(author2);
    orm.em.clear();

    const a2 = await orm.em.findOneOrFail(Author2, { id: author2.id }, { populate: ['books2', 'following'] });
    expect(a2.books2).toHaveLength(2);
    expect(a2.books2[0].title).toEqual('The Stranger');
    expect(a2.books2[1].title).toEqual('The Fall');
  });

  test('populate OneToMany with joined strategy [find()]', async () => {
    const a1 = new Author2('Albert Camus 1', 'albert.camus1@email.com');
    a1.books2.add(new Book2('The Stranger 1', a1), new Book2('The Fall 1', a1));
    const a2 = new Author2('Albert Camus 2', 'albert.camus2@email.com');
    a2.books2.add(new Book2('The Stranger 2', a2), new Book2('The Fall 2', a2));
    const a3 = new Author2('Albert Camus 3', 'albert.camus3@email.com');
    a3.books2.add(new Book2('The Stranger 3', a3), new Book2('The Fall 3', a3));
    await orm.em.persistAndFlush([a1, a2, a3]);
    orm.em.clear();

    const ret = await orm.em.find(Author2, {}, { populate: ['books2', 'following'], orderBy: { email: 'asc' } });
    expect(ret).toHaveLength(3);
    expect(ret[0].books2).toHaveLength(2);
    expect(ret[0].books2[0].title).toEqual('The Stranger 1');
    expect(ret[0].books2[1].title).toEqual('The Fall 1');
    expect(ret[1].books2).toHaveLength(2);
    expect(ret[1].books2[0].title).toEqual('The Stranger 2');
    expect(ret[1].books2[1].title).toEqual('The Fall 2');
    expect(ret[2].books2).toHaveLength(2);
    expect(ret[2].books2[0].title).toEqual('The Stranger 3');
    expect(ret[2].books2[1].title).toEqual('The Fall 3');
  });

  test('should only fire one query [findOne()]', async () => {
    const author2 = new Author2('Albert Camus', 'albert.camus@email.com');
    const stranger = new Book2('The Stranger', author2);
    const fall = new Book2('The Fall', author2);
    author2.books2.add(stranger, fall);
    await orm.em.persistAndFlush(author2);
    orm.em.clear();

    const mock = jest.fn();
    const logger = new Logger(mock, true);
    Object.assign(orm.em.config, { logger });

    await orm.em.findOneOrFail(Author2, { id: author2.id }, { populate: { books2: { perex: true } } });
    expect(mock.mock.calls.length).toBe(1);
    expect(mock.mock.calls[0][0]).toMatch('select "e0"."id", "e0"."created_at", "e0"."updated_at", "e0"."name", "e0"."email", "e0"."age", "e0"."terms_accepted", "e0"."optional", "e0"."identities", "e0"."born", "e0"."born_time", "e0"."favourite_book_uuid_pk", "e0"."favourite_author_id", ' +
      '"b1"."uuid_pk" as "b1_uuid_pk", "b1"."created_at" as "b1_created_at", "b1"."title" as "b1_title", "b1"."perex" as "b1_perex", "b1"."price" as "b1_price", "b1"."double" as "b1_double", "b1"."meta" as "b1_meta", "b1"."author_id" as "b1_author_id", "b1"."publisher_id" as "b1_publisher_id" ' +
      'from "author2" as "e0" ' +
      'left join "book2" as "b1" on "e0"."id" = "b1"."author_id" ' +
      'where "e0"."id" = $1');

    orm.em.clear();
    mock.mock.calls.length = 0;
    await orm.em.findOneOrFail(Author2, { id: author2.id }, { populate: { books2: true } });
    expect(mock.mock.calls.length).toBe(1);
    expect(mock.mock.calls[0][0]).toMatch('select "e0"."id", "e0"."created_at", "e0"."updated_at", "e0"."name", "e0"."email", "e0"."age", "e0"."terms_accepted", "e0"."optional", "e0"."identities", "e0"."born", "e0"."born_time", "e0"."favourite_book_uuid_pk", "e0"."favourite_author_id", ' +
      '"b1"."uuid_pk" as "b1_uuid_pk", "b1"."created_at" as "b1_created_at", "b1"."title" as "b1_title", "b1"."price" as "b1_price", "b1"."double" as "b1_double", "b1"."meta" as "b1_meta", "b1"."author_id" as "b1_author_id", "b1"."publisher_id" as "b1_publisher_id" ' +
      'from "author2" as "e0" ' +
      'left join "book2" as "b1" on "e0"."id" = "b1"."author_id" ' +
      'where "e0"."id" = $1');

    orm.em.clear();
    mock.mock.calls.length = 0;
    await orm.em.findOneOrFail(Author2, { id: author2.id }, { populate: { books: LoadStrategy.JOINED } });
    expect(mock.mock.calls.length).toBe(1);
    expect(mock.mock.calls[0][0]).toMatch('select "e0"."id", "e0"."created_at", "e0"."updated_at", "e0"."name", "e0"."email", "e0"."age", "e0"."terms_accepted", "e0"."optional", "e0"."identities", "e0"."born", "e0"."born_time", "e0"."favourite_book_uuid_pk", "e0"."favourite_author_id", ' +
      '"b1"."uuid_pk" as "b1_uuid_pk", "b1"."created_at" as "b1_created_at", "b1"."title" as "b1_title", "b1"."price" as "b1_price", "b1"."double" as "b1_double", "b1"."meta" as "b1_meta", "b1"."author_id" as "b1_author_id", "b1"."publisher_id" as "b1_publisher_id" ' +
      'from "author2" as "e0" ' +
      'left join "book2" as "b1" on "e0"."id" = "b1"."author_id" ' +
      'where "e0"."id" = $1');

    orm.em.clear();
    mock.mock.calls.length = 0;
    await orm.em.findOneOrFail(Author2, { id: author2.id }, { populate: { books: [LoadStrategy.JOINED, { perex: true }] } });
    expect(mock.mock.calls.length).toBe(1);
    expect(mock.mock.calls[0][0]).toMatch('select "e0"."id", "e0"."created_at", "e0"."updated_at", "e0"."name", "e0"."email", "e0"."age", "e0"."terms_accepted", "e0"."optional", "e0"."identities", "e0"."born", "e0"."born_time", "e0"."favourite_book_uuid_pk", "e0"."favourite_author_id", ' +
      '"b1"."uuid_pk" as "b1_uuid_pk", "b1"."created_at" as "b1_created_at", "b1"."title" as "b1_title", "b1"."perex" as "b1_perex", "b1"."price" as "b1_price", "b1"."double" as "b1_double", "b1"."meta" as "b1_meta", "b1"."author_id" as "b1_author_id", "b1"."publisher_id" as "b1_publisher_id" ' +
      'from "author2" as "e0" ' +
      'left join "book2" as "b1" on "e0"."id" = "b1"."author_id" ' +
      'where "e0"."id" = $1');
  });

  test('should only fire one query [find()]', async () => {
    const author2 = new Author2('Albert Camus', 'albert.camus@email.com');
    const stranger = new Book2('The Stranger', author2);
    const fall = new Book2('The Fall', author2);
    author2.books2.add(stranger, fall);
    await orm.em.persistAndFlush(author2);
    orm.em.clear();

    const mock = jest.fn();
    const logger = new Logger(mock, true);
    Object.assign(orm.em.config, { logger });

    await orm.em.find(Author2, { id: author2.id }, { populate: { books2: { perex: true } } });
    expect(mock.mock.calls.length).toBe(1);
    expect(mock.mock.calls[0][0]).toMatch('select "e0"."id", "e0"."created_at", "e0"."updated_at", "e0"."name", "e0"."email", "e0"."age", "e0"."terms_accepted", "e0"."optional", "e0"."identities", "e0"."born", "e0"."born_time", "e0"."favourite_book_uuid_pk", "e0"."favourite_author_id", ' +
      '"b1"."uuid_pk" as "b1_uuid_pk", "b1"."created_at" as "b1_created_at", "b1"."title" as "b1_title", "b1"."perex" as "b1_perex", "b1"."price" as "b1_price", "b1"."double" as "b1_double", "b1"."meta" as "b1_meta", "b1"."author_id" as "b1_author_id", "b1"."publisher_id" as "b1_publisher_id" ' +
      'from "author2" as "e0" ' +
      'left join "book2" as "b1" on "e0"."id" = "b1"."author_id" ' +
      'where "e0"."id" = $1');

    orm.em.clear();
    mock.mock.calls.length = 0;
    await orm.em.find(Author2, { id: author2.id }, { populate: { books2: true } });
    expect(mock.mock.calls.length).toBe(1);
    expect(mock.mock.calls[0][0]).toMatch('select "e0"."id", "e0"."created_at", "e0"."updated_at", "e0"."name", "e0"."email", "e0"."age", "e0"."terms_accepted", "e0"."optional", "e0"."identities", "e0"."born", "e0"."born_time", "e0"."favourite_book_uuid_pk", "e0"."favourite_author_id", ' +
      '"b1"."uuid_pk" as "b1_uuid_pk", "b1"."created_at" as "b1_created_at", "b1"."title" as "b1_title", "b1"."price" as "b1_price", "b1"."double" as "b1_double", "b1"."meta" as "b1_meta", "b1"."author_id" as "b1_author_id", "b1"."publisher_id" as "b1_publisher_id" ' +
      'from "author2" as "e0" ' +
      'left join "book2" as "b1" on "e0"."id" = "b1"."author_id" ' +
      'where "e0"."id" = $1');

    orm.em.clear();
    mock.mock.calls.length = 0;
    await orm.em.find(Author2, { id: author2.id }, { populate: { books: LoadStrategy.JOINED } });
    expect(mock.mock.calls.length).toBe(1);
    expect(mock.mock.calls[0][0]).toMatch('select "e0"."id", "e0"."created_at", "e0"."updated_at", "e0"."name", "e0"."email", "e0"."age", "e0"."terms_accepted", "e0"."optional", "e0"."identities", "e0"."born", "e0"."born_time", "e0"."favourite_book_uuid_pk", "e0"."favourite_author_id", ' +
      '"b1"."uuid_pk" as "b1_uuid_pk", "b1"."created_at" as "b1_created_at", "b1"."title" as "b1_title", "b1"."price" as "b1_price", "b1"."double" as "b1_double", "b1"."meta" as "b1_meta", "b1"."author_id" as "b1_author_id", "b1"."publisher_id" as "b1_publisher_id" ' +
      'from "author2" as "e0" ' +
      'left join "book2" as "b1" on "e0"."id" = "b1"."author_id" ' +
      'where "e0"."id" = $1');

    orm.em.clear();
    mock.mock.calls.length = 0;
    await orm.em.find(Author2, { id: author2.id }, { populate: { books: [LoadStrategy.JOINED, { perex: true }] } });
    expect(mock.mock.calls.length).toBe(1);
    expect(mock.mock.calls[0][0]).toMatch('select "e0"."id", "e0"."created_at", "e0"."updated_at", "e0"."name", "e0"."email", "e0"."age", "e0"."terms_accepted", "e0"."optional", "e0"."identities", "e0"."born", "e0"."born_time", "e0"."favourite_book_uuid_pk", "e0"."favourite_author_id", ' +
      '"b1"."uuid_pk" as "b1_uuid_pk", "b1"."created_at" as "b1_created_at", "b1"."title" as "b1_title", "b1"."perex" as "b1_perex", "b1"."price" as "b1_price", "b1"."double" as "b1_double", "b1"."meta" as "b1_meta", "b1"."author_id" as "b1_author_id", "b1"."publisher_id" as "b1_publisher_id" ' +
      'from "author2" as "e0" ' +
      'left join "book2" as "b1" on "e0"."id" = "b1"."author_id" ' +
      'where "e0"."id" = $1');
  });

  test('can populate all related entities', async () => {
    const author2 = new Author2('Albert Camus', 'albert.camus@email.com');
    const stranger = new Book2('The Stranger', author2);
    const fall = new Book2('The Fall', author2);
    author2.books2.add(stranger, fall);
    await orm.em.persistAndFlush(author2);
    orm.em.clear();

    const a2 = await orm.em.findOneOrFail(Author2, { id: author2.id }, { populate: true });
    expect(a2.books2).toHaveLength(2);
    expect(a2.books).toHaveLength(2);
  });

  test('when related records exist it still returns the root entity', async () => {
    const author2 = new Author2('Albert Camus', 'albert.camus@email.com');
    await orm.em.persistAndFlush(author2);
    orm.em.clear();

    const a2 = await orm.em.findOneOrFail(Author2, { id: author2.id }, { populate: ['books2'] });
    expect(a2).toHaveProperty('id');
    expect(a2.books2).toHaveLength(0);
  });

  test('when the root entity does not exist', async () => {
    const a2 = await orm.em.findOne(Author2, { id: 1 }, { populate: ['books2'] });
    expect(a2).toBeNull();
  });

  test('when populating only a single relation via em.populate', async () => {
    const author2 = new Author2('Albert Camus', 'albert.camus@email.com');
    const stranger = new Book2('The Stranger', author2);
    const fall = new Book2('The Fall', author2);
    author2.books2.add(stranger, fall);
    await orm.em.persistAndFlush(author2);
    orm.em.clear();

    const a2 = await orm.em.findOneOrFail(Author2, { id: 1 });
    await orm.em.populate(a2, 'books2');
    expect(a2.books2).toHaveLength(2);
  });

  test.todo('populate OneToOne with joined strategy');
  test.todo('populate ManyToMany with joined strategy');
  test.todo('handles nested joinedLoads that map to the same entity, eg book.author.favouriteAuthor');
  test.todo('works with em.find()');
  test.todo('works with formulas');

});
